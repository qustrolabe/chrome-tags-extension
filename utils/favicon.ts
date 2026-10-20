/** Favicon URL for a bookmark, shared by card and table views. */
export const faviconURL = (url: string): string => {
  try {
    if (import.meta.env.FIREFOX) {
      const domain = new URL(url).hostname;

      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    }

    // SAFETY: "/_favicon/" is Chrome's built-in favicon endpoint, not one of
    // the extension's own pages, so WXT's getURL overloads reject the literal.
    const getRuntimeUrl = browser.runtime.getURL as (path: string) => string;
    const faviconUrl = new URL(getRuntimeUrl("/_favicon/"));

    faviconUrl.searchParams.set("pageUrl", url);
    faviconUrl.searchParams.set("size", "16");

    return faviconUrl.toString();
  } catch {
    return "";
  }
};
