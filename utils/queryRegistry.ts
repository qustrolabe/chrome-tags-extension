import {
  BOOKMARK_KEY_SPECS,
  createRegistry,
  matchesBounds,
  parseBounds,
  type KeySpec,
} from "@queryfield/core";

/**
 * Host-local filter keys, composed on top of the bookmark preset.
 *
 * `last_visited` is not a browser fact like `last_used` (`dateLastUsed`): it
 * reads the timestamp this extension records itself when a bookmark's exact
 * URL shows up in a tab (`TrackingContext`). Keeping the spec here means
 * @queryfield stays free of app concepts, and the engine needs no changes.
 *
 * A bookmark without a tracking entry never matches, for either bound — the
 * same rule `dateMatch` applies to a missing `dateLastUsed`. Substituting `0`
 * would make `last_visited:>1y` report an untracked bookmark as a year stale.
 */
const LAST_VISITED: KeySpec = {
  key: "last_visited",
  label: "last visited",
  description: "same as last_used but tracked by this extension",
  kind: "date",
  match: (bookmark, value, ctx) => {
    const timestamp = ctx.stats[bookmark.id]?.lastVisited;
    const bounds = parseBounds(value, { requireUnit: true });

    if (!timestamp || !bounds || bounds.length === 0) return false;

    return matchesBounds(Math.max(0, ctx.now - timestamp), bounds);
  },
  validate: (value) => parseBounds(value, { requireUnit: true }) !== null,
};

/**
 * Key order for suggestions: the preset's own order, with the app-local
 * tracking key parked next to the other tracking keys — right after
 * `last_used`, before `visits` / `frecency`.
 *
 * `last_used` reads `dateLastUsed`, which is Chromium-only (Chrome 114+), so
 * its comment says so. Only the prefix is the app's: everything after it stays
 * the preset's wording, which beats restating the sentence here and drifting.
 *
 * The preset labels both folder keys "folder". The suggestion capsule is the
 * only place a label shows, and there it has to say which key a row inserts,
 * so `folder_strict` is spelled out here.
 */
const APP_KEY_SPECS: KeySpec[] = BOOKMARK_KEY_SPECS.flatMap((spec) => {
  if (spec.key === "last_used") {
    return [
      {
        ...spec,
        description: `(Chromium specific) ${spec.description}`,
      },
      LAST_VISITED,
    ];
  }

  if (spec.key === "folder_strict") return [{ ...spec, label: "folder strict" }];

  return [spec];
});

/**
 * The registry every query surface must use: `BookmarksContext` for filtering,
 * and `SearchBar`'s `QueryInput` for key/value suggestions and token painting.
 */
export const appRegistry = createRegistry(APP_KEY_SPECS);
