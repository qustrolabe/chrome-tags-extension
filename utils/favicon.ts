/** Favicon URL for a bookmark, shared by card and table views. */
export const faviconURL = (url: string): string => {
  try {
    if (import.meta.env.FIREFOX) {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    }
    const faviconUrl = new URL(
      (browser.runtime.getURL as (p: string) => string)("/_favicon/"),
    );
    faviconUrl.searchParams.set("pageUrl", url);
    faviconUrl.searchParams.set("size", "16");
    return faviconUrl.toString();
  } catch {
    return "";
  }
};
