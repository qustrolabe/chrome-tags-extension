import {
  DEFAULT_MAX_AGE,
  DEFAULT_TRACKING_ENABLED,
  TRACKING_STORAGE_KEYS,
  TrackingStatsMap,
  clampNonNegative,
} from "@/utils/tracking";

const DEDUPE_MS = 30_000;

export default defineBackground(() => {
  let trackingEnabled = DEFAULT_TRACKING_ENABLED;
  let maxAge = DEFAULT_MAX_AGE;
  let statsCache: TrackingStatsMap = {};
  const urlIndex = new Map<string, string[]>();
  const recentVisits = new Map<number, { url: string; ts: number }>();
  let rebuildTimer: number | null = null;

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
    trackingEnabled = typeof result[TRACKING_STORAGE_KEYS.enabled] === "boolean"
      ? (result[TRACKING_STORAGE_KEYS.enabled] as boolean)
      : DEFAULT_TRACKING_ENABLED;
    maxAge = typeof result[TRACKING_STORAGE_KEYS.maxAge] === "number"
      ? (result[TRACKING_STORAGE_KEYS.maxAge] as number)
      : DEFAULT_MAX_AGE;
    statsCache = normalizeStats(result[TRACKING_STORAGE_KEYS.stats] as TrackingStatsMap);
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
    }, 250) as unknown as number;
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
    if (typeof tabId === "number") {
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
    (browser as any).browserAction.onClicked.addListener(() => {
      browser.tabs.create({ url: browser.runtime.getURL("/mainpage.html") });
    });
  }

  browser.storage.onChanged.addListener((changes) => {
    if (TRACKING_STORAGE_KEYS.enabled in changes) {
      trackingEnabled = Boolean(changes[TRACKING_STORAGE_KEYS.enabled].newValue);
    }
    if (TRACKING_STORAGE_KEYS.maxAge in changes) {
      const value = changes[TRACKING_STORAGE_KEYS.maxAge].newValue;
      if (typeof value === "number") maxAge = value;
    }
    if (TRACKING_STORAGE_KEYS.stats in changes) {
      statsCache = normalizeStats(changes[TRACKING_STORAGE_KEYS.stats].newValue as TrackingStatsMap);
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
