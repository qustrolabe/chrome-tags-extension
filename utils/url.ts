/**
 * URL inspection for the quick-bookmark window's params explorer.
 *
 * Parsing is deliberately done over the raw query string rather than via
 * `URLSearchParams.entries()`: the latter cannot tell `?debug` from
 * `?debug=`, and the explorer wants to show that difference.
 */

/** One query-string entry, already percent-decoded. */
export interface UrlParam {
  /** Decoded parameter name. */
  key: string;
  /** Decoded value; empty string when there was no `=`. */
  value: string;
  /** True when the pair had no `=` at all, e.g. `?debug`. */
  bare: boolean;
}

/** decodeURIComponent that yields the input instead of throwing on bad `%`. */
const safeDecode = (raw: string): string => {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
};

/**
 * Split a URL's query string into entries. Returns [] for anything
 * unparseable or parameter-less (empty strings, `chrome://…`, typos
 * mid-edit) — the caller renders that as "no params", never as an error.
 */
export const parseUrlParams = (url: string): UrlParam[] => {
  const trimmed = url.trim();
  if (!trimmed || !URL.canParse(trimmed)) return [];

  let query: string;
  try {
    query = new URL(trimmed).search.slice(1);
  } catch {
    return [];
  }
  if (!query) return [];

  return query
    .split("&")
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const eq = pair.indexOf("=");
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
      return {
        key: safeDecode(rawKey),
        value: safeDecode(rawValue),
        bare: eq === -1,
      };
    });
};

/** How a param is shown in the explorer: `?a=1`, or just `?a` when valueless. */
export const formatUrlParam = ({ key, value, bare }: UrlParam): string =>
  bare || value === "" ? `?${key}` : `?${key}=${value}`;