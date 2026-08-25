/**
 * Case-insensitive wildcard matching.
 * `*` matches any sequence of characters (including none).
 * A pattern without `*` performs a substring match instead,
 * so plain values behave like "contains".
 */
export const globMatch = (pattern: string, text: string): boolean => {
  const p = pattern.toLowerCase();
  const t = text.toLowerCase();

  if (!p.includes("*")) {
    return t.includes(p);
  }

  // Full-string glob. Build regex from escaped pattern with .* for stars.
  const escaped = p
    .split("*")
    .map((segment) => segment.replace(/[.+^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`).test(t);
};

/**
 * Split a value into `/`-separated segments (folder chains like "dev/tools").
 * Empty segments are dropped.
 */
export const splitSegments = (value: string): string[] =>
  value.split("/").map((s) => s.trim()).filter((s) => s.length > 0);

/**
 * Name-like matching: `*` patterns are full-string globs,
 * plain values must match EXACTLY (case-insensitive).
 * Used by tag:, folder:, folder_strict: — unlike url:/title: which
 * stay substring-based.
 */
export const patternMatch = (pattern: string, text: string): boolean => {
  if (!pattern.includes("*")) {
    return pattern.toLowerCase() === text.toLowerCase();
  }
  return globMatch(pattern, text);
};
