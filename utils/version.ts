/**
 * Dev-build markers.
 *
 * `IS_DEV` is true only for `bun run dev` (the WXT dev server). Release
 * builds (`build` / `zip`) run in production mode and must stay unmarked —
 * that is the build users actually install.
 */

/** True in `bun run dev`, false in `bun run build` / `zip`. */
export const IS_DEV = import.meta.env.DEV;

/** `package.json` version, injected by `wxt.config.ts`. */
export const APP_VERSION = __APP_VERSION__;

/** Short commit hash, injected by `wxt.config.ts`. Empty outside git. */
export const GIT_COMMIT = __GIT_COMMIT__;

/** Commits between this build and the last release tag. 0 on a release commit. */
export const COMMITS_SINCE_RELEASE = __GIT_AHEAD__;

/** "+91" on an unreleased build, "" when the build is the tagged commit. */
export const AHEAD_SUFFIX = COMMITS_SINCE_RELEASE > 0
  ? `+${COMMITS_SINCE_RELEASE}`
  : "";

/** "0.6.1" on the release commit, "0.6.1+91" on anything built after it. */
export const APP_VERSION_LABEL = `${APP_VERSION}${AHEAD_SUFFIX}`;

/** "0.6.1+91" in a release, "0.6.1+91-dev · cfbb930" in a dev build. */
export const VERSION_LABEL = IS_DEV
  ? `${APP_VERSION_LABEL}-dev${GIT_COMMIT ? ` · ${GIT_COMMIT}` : ""}`
  : APP_VERSION_LABEL;

/** Marks the document title so open tabs are tellable apart. */
export const DEV_TITLE_PREFIX = "(dev) ";

/** Prefix the document title in dev builds. Idempotent. */
export const applyDevTitle = () => {
  if (!IS_DEV) return;

  if (document.title.startsWith(DEV_TITLE_PREFIX)) return;
  document.title = `${DEV_TITLE_PREFIX}${document.title}`;
};