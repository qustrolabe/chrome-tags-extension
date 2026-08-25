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
