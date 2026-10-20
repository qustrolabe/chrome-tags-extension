import {
  DEFAULT_MAX_AGE,
  DEFAULT_TRACKING_ENABLED,
  TRACKING_STORAGE_KEYS,
  type TrackingStatsMap,
  clampNonNegative,
} from "@/utils/tracking";
import {
  decodeStored,
  storedBoolean,
  storedNumber,
  storedString,
  trackingStatsSchema,
} from "@/utils/storageDecode.ts";
import { IS_DEV } from "@/utils/version.ts";

const DEDUPE_MS = 30_000;

// SAFETY: Chrome documents "page" and "link" as ContextType values, but the
// generated enum is nominal, so literals need its declared type.
const MENU_CONTEXTS = {
  page: "page" as Browser.contextMenus.ContextType,
  link: "link" as Browser.contextMenus.ContextType,
};

export default defineBackground(() => {
  let trackingEnabled = DEFAULT_TRACKING_ENABLED;
  let maxAge = DEFAULT_MAX_AGE;
  let statsCache: TrackingStatsMap = {};
  const urlIndex = new Map<string, string[]>();
  const recentVisits = new Map<number, { url: string; ts: number }>();
  // `ReturnType<typeof setTimeout>` rather than `number`: with both DOM lib and
  // @types/node in scope the global is an overload set, and the timer handle the
  // runtime hands back is whichever one actually won. Asserting `number` here
  // was papering over that mismatch.
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  const normalizeStats = (stats: TrackingStatsMap | undefined | null): TrackingStatsMap => {
    if (!stats) return {};
    const normalized: TrackingStatsMap = {};

    for (const [id, value] of Object.entries(stats)) {
      normalized[id] = {
        visits: clampNonNegative(value?.visits ?? 0),
        score: clampNonNegative(value?.score ?? 0),
        lastVisited: clampNonNegative(value?.lastVisited ?? 0),
      };
    }

    return normalized;
  };

  const loadSettingsAndStats = async () => {
    const result = await browser.storage.local.get([
      TRACKING_STORAGE_KEYS.enabled,
      TRACKING_STORAGE_KEYS.maxAge,
      TRACKING_STORAGE_KEYS.stats,
    ]);

    trackingEnabled = decodeStored(
      storedBoolean,
      result[TRACKING_STORAGE_KEYS.enabled],
    ) ?? DEFAULT_TRACKING_ENABLED;
    maxAge = decodeStored(
      storedNumber,
      result[TRACKING_STORAGE_KEYS.maxAge],
    ) ?? DEFAULT_MAX_AGE;
    statsCache = normalizeStats(
      decodeStored(trackingStatsSchema, result[TRACKING_STORAGE_KEYS.stats]),
    );
  };

  const buildUrlIndex = async () => {
    const tree = await browser.bookmarks.getTree();
    urlIndex.clear();
    const stack = [...tree];

    while (stack.length) {
      const node = stack.pop();

      if (!node) continue;

      if (node.url) {
        const existing = urlIndex.get(node.url);

        if (existing) {
          existing.push(node.id);
        } else {
          urlIndex.set(node.url, [node.id]);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          stack.push(child);
        }
      }
    }
  };

  const scheduleRebuild = () => {
    if (rebuildTimer !== null) {
      clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      buildUrlIndex();
    }, 250);
  };

  const persistStats = async () => {
    await browser.storage.local.set({ [TRACKING_STORAGE_KEYS.stats]: statsCache });
  };

  const applyMaxAgeScaling = () => {
    const total = Object.values(statsCache).reduce((sum, stat) => sum + stat.score, 0);

    if (total < maxAge || total === 0) return;
    const scale = (maxAge * 0.9) / total;

    for (const stat of Object.values(statsCache)) {
      stat.score = stat.score * scale;
    }
  };

  const handleVisit = async (url: string, tabId?: number) => {
    if (!trackingEnabled) return;
    const bookmarkIds = urlIndex.get(url);

    if (!bookmarkIds || bookmarkIds.length === 0) return;

    const now = Date.now();

    if (tabId !== undefined) {
      const recent = recentVisits.get(tabId);

      if (recent && recent.url === url && now - recent.ts < DEDUPE_MS) {
        return;
      }

      recentVisits.set(tabId, { url, ts: now });
    }

    for (const id of bookmarkIds) {
      const stat = statsCache[id] || { visits: 0, score: 0, lastVisited: 0 };
      stat.visits += 1;
      stat.score += 1;
      stat.lastVisited = now;
      statsCache[id] = stat;
    }

    applyMaxAgeScaling();
    await persistStats();
  };

  const LAST_FOLDER_KEY = "lastBookmarkFolderId";

  const findBookmarksByUrl = async (url: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
    try {
      const results = await browser.bookmarks.search({ url });

      return results.filter((n) => n.url === url);
    } catch {
      // Fallback: walk the tree
      const tree = await browser.bookmarks.getTree();
      const out: chrome.bookmarks.BookmarkTreeNode[] = [];
      const stack = [...tree];

      while (stack.length) {
        const node = stack.pop();

        if (!node) continue;

        if (node.url === url) out.push(node);

        if (node.children) for (const c of node.children) stack.push(c);
      }

      return out;
    }
  };

  const getDefaultFolderId = async (): Promise<string | undefined> => {
    try {
      const stored = await browser.storage.local.get(LAST_FOLDER_KEY);
      const lastId = decodeStored(storedString, stored[LAST_FOLDER_KEY]);

      if (lastId) {
        try {
          const nodes = await browser.bookmarks.get(lastId);
          const n = nodes[0];

          if (n && !n.url) return lastId; // still a folder
        } catch {}
      }
    } catch {}

    // Fallback to Bookmarks bar
    try {
      const tree = await browser.bookmarks.getTree();
      const stack = [...tree];
      const folders: chrome.bookmarks.BookmarkTreeNode[] = [];

      while (stack.length) {
        const n = stack.pop();

        if (!n) continue;

        if (!n.url) folders.push(n);

        if (n.children) for (const c of n.children) stack.push(c);
      }

      const bar = folders.find((f) => f.parentId === "0" && f.title.toLowerCase() === "bookmarks bar");

      if (bar) return bar.id;
      // Chrome id "1" is often Bookmarks bar
      const byId1 = folders.find((f) => f.id === "1");

      if (byId1) return byId1.id;
      const firstRoot = folders.find((f) => f.parentId === "0");

      if (firstRoot) return firstRoot.id;
    } catch {}

    return undefined;
  };

  const openQuickBookmarkWindow = async (bookmarkId: string, isExisting: boolean) => {
    const url = browser.runtime.getURL(`/quick-bookmark.html?id=${encodeURIComponent(bookmarkId)}&existing=${isExisting ? "1" : "0"}`);

    try {
      await browser.windows.create({
        url,
        type: "popup",
        width: 1020,
        height: 620,
        focused: true,
      });
    } catch {
      // Fallback for environments without windows permission/popup support
      await browser.tabs.create({ url });
    }
  };

  const getContextMenus = (): typeof browser.contextMenus | undefined =>
    browser.contextMenus ?? globalThis.chrome?.contextMenus;

  const setupContextMenu = () => {
    const ctx = getContextMenus();

    if (!ctx) {
      console.warn("[background] contextMenus API not available", {
        hasBrowser: Boolean(browser.contextMenus),
        hasChrome: Boolean(globalThis.chrome?.contextMenus),
      });

      return;
    }

    const create = () => {
      const createOne = (
        id: string,
        title: string,
        contexts: [
          Browser.contextMenus.ContextType,
          ...Browser.contextMenus.ContextType[],
        ],
      ) => {
        try {
          const properties: Browser.contextMenus.CreateProperties = {
            id,
            title,
            contexts,
          };

          ctx.create(properties, () => {
            const err = browser.runtime.lastError ?? globalThis.chrome?.runtime?.lastError;

            if (err?.message) console.warn(`[background] contextMenus.create ${id} lastError`, err);
          });
        } catch (e) {
          console.warn(`[background] contextMenus.create ${id} threw`, e);
        }
      };

      // Label dev builds so the menu is identifiable next to the release one.
      const devSuffix = IS_DEV ? " (dev)" : "";
      createOne("bookmark-page", `Bookmark this page${devSuffix}`, [MENU_CONTEXTS.page]);
      createOne("bookmark-link", `Bookmark this link${devSuffix}`, [MENU_CONTEXTS.link]);
      console.log("[background] context menus created");
    };

    // Prefer promise form (WXT/browser polyfill), fallback to callback form (chrome)
    try {
      const res = ctx.removeAll();

      if (res instanceof Promise) {
        res.then(create).catch((e) => {
          console.warn("[background] removeAll promise failed", e);
          create();
        });

        return;
      }
    } catch {}

    // callback form
    try {
      ctx.removeAll(() => {
        const err = browser.runtime.lastError ?? globalThis.chrome?.runtime?.lastError;

        if (err) console.warn("[background] removeAll lastError", err);
        create();
      });
    } catch (e) {
      console.warn("[background] removeAll threw", e);
      create();
    }
  };

  const handleBookmarkThis = async (
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab,
  ) => {
    const isPage = info.menuItemId === "bookmark-page";
    const isLink = info.menuItemId === "bookmark-link";
    // keep backward compat with old id
    const isLegacy = info.menuItemId === "bookmark-this";

    if (!isPage && !isLink && !isLegacy) return;
    const url = isLink ? (info.linkUrl || "").trim() : (tab?.url || info.pageUrl || "").trim();
    // For legacy, prefer linkUrl if present (old emergent behavior)
    const legacyUrl = isLegacy ? (info.linkUrl || tab?.url || info.pageUrl || "").trim() : url;
    const finalUrl = isLegacy ? legacyUrl : url;

    // SAFETY: Firefox adds `linkText` to OnClickData; Chrome's and WXT's
    // typings only describe the Chrome shape.
    const linkText = (info as chrome.contextMenus.OnClickData & {
      linkText?: string;
    }).linkText;

    const title = isLink
      ? linkText?.trim() || finalUrl
      : tab?.title?.trim() || finalUrl;

    if (!finalUrl) return;

    if (
      finalUrl.startsWith("chrome://") ||
      // finalUrl.startsWith("chrome-extension://") ||
      // finalUrl.startsWith("moz-extension://") ||
      finalUrl.startsWith("about:") ||
      finalUrl.startsWith("edge://")
    ) {
      return;
    }

    const existing = await findBookmarksByUrl(finalUrl);

    if (existing.length > 0) {
      const bookmark = existing[0]!;
      await openQuickBookmarkWindow(bookmark.id, true);

      return;
    }

    try {
      const parentId = await getDefaultFolderId();
      const created = await browser.bookmarks.create({ title, url: finalUrl, parentId });
      scheduleRebuild();
      await openQuickBookmarkWindow(created.id, false);
    } catch (e) {
      console.error("[background] bookmark create failed", e);
    }
  };

  const bookmarkActiveTab = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url) return;
      const finalUrl = tab.url.trim();
      const title = tab.title?.trim() || finalUrl;

      if (
        finalUrl.startsWith("chrome://") ||
        // finalUrl.startsWith("chrome-extension://") ||
        // finalUrl.startsWith("moz-extension://") ||
        finalUrl.startsWith("about:") ||
        finalUrl.startsWith("edge://")
      ) {
        return;
      }

      const existing = await findBookmarksByUrl(finalUrl);

      if (existing.length > 0) {
        await openQuickBookmarkWindow(existing[0]!.id, true);

        return;
      }

      const parentId = await getDefaultFolderId();
      const created = await browser.bookmarks.create({ title, url: finalUrl, parentId });
      scheduleRebuild();
      await openQuickBookmarkWindow(created.id, false);
    } catch (e) {
      console.error("[background] bookmarkActiveTab failed", e);
    }
  };

  // Register context menu synchronously at top-level so it survives service worker restarts.
  // Chrome MV3 requires menus be (re)created on every startup; onInstalled handles first install,
  // and an immediate call handles reloads. The async init must not delay this.
  browser.runtime.onInstalled.addListener(setupContextMenu);
  browser.runtime.onStartup.addListener(setupContextMenu);
  // Immediate attempt for reloads / dev rebuilds where onInstalled won't fire
  setupContextMenu();
  const ctxMenus = getContextMenus();

  if (ctxMenus?.onClicked) {
    ctxMenus.onClicked.addListener(handleBookmarkThis);
  } else {
    console.warn("[background] contextMenus.onClicked not available, menu clicks will not work");
  }

  // Keyboard shortcut (user-assignable in chrome://extensions/shortcuts)
  try {
    browser.commands.onCommand.addListener((cmd) => {
      if (cmd === "bookmark-this-page") bookmarkActiveTab();
    });
  } catch {}

  const init = async () => {
    await loadSettingsAndStats();
    await buildUrlIndex();
  };

  init();

  if (import.meta.env.MANIFEST_VERSION === 3) {
    browser.action.onClicked.addListener(() => {
      browser.tabs.create({ url: browser.runtime.getURL("/mainpage.html") });
    });
  } else {
    browser.browserAction.onClicked.addListener(() => {
      browser.tabs.create({ url: browser.runtime.getURL("/mainpage.html") });
    });
  }

  browser.storage.onChanged.addListener((changes) => {
    if (TRACKING_STORAGE_KEYS.enabled in changes) {
      const enabled = decodeStored(
        storedBoolean,
        changes[TRACKING_STORAGE_KEYS.enabled]?.newValue,
      );

      if (enabled !== undefined) trackingEnabled = enabled;
    }

    if (TRACKING_STORAGE_KEYS.maxAge in changes) {
      const maxAgeChange = decodeStored(
        storedNumber,
        changes[TRACKING_STORAGE_KEYS.maxAge]?.newValue,
      );

      if (maxAgeChange !== undefined) maxAge = maxAgeChange;
    }

    if (TRACKING_STORAGE_KEYS.stats in changes) {
      const change = changes[TRACKING_STORAGE_KEYS.stats];

      if (change) {
        statsCache = normalizeStats(
          decodeStored(trackingStatsSchema, change.newValue) ?? {},
        );
      }
    }
  });

  browser.bookmarks.onCreated.addListener(scheduleRebuild);
  browser.bookmarks.onChanged.addListener(scheduleRebuild);
  browser.bookmarks.onMoved.addListener(scheduleRebuild);
  browser.bookmarks.onRemoved.addListener((id) => {
    if (statsCache[id]) {
      delete statsCache[id];
      persistStats();
    }

    scheduleRebuild();
  });

  browser.tabs.onActivated.addListener((info) => {
    browser.tabs.get(info.tabId).then((tab) => {
      if (tab.url) handleVisit(tab.url, info.tabId);
    });
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      handleVisit(changeInfo.url, tabId);

      return;
    }

    if (changeInfo.status === "complete" && tab.url) {
      handleVisit(tab.url, tabId);
    }
  });
});
