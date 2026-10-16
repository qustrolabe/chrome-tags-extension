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

/** "0.6.1" in a release, "0.6.1-dev · cfbb930" in a dev build. */
export const VERSION_LABEL = IS_DEV
  ? `${APP_VERSION}-dev${GIT_COMMIT ? ` · ${GIT_COMMIT}` : ""}`
  : APP_VERSION;

/** Marks the document title so open tabs are tellable apart. */
export const DEV_TITLE_PREFIX = "(dev) ";

/** Prefix the document title in dev builds. Idempotent. */
export const applyDevTitle = () => {
  if (!IS_DEV) return;

  if (document.title.startsWith(DEV_TITLE_PREFIX)) return;
  document.title = `${DEV_TITLE_PREFIX}${document.title}`;
};