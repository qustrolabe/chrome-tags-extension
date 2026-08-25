/**
 * Tag parsing and indexing.
 *
 * Tag model decisions (locked):
 * - Tags live in bookmark titles as "#name".
 * - A tag is everything from "#" up to the next whitespace; trailing
 *   punctuation (.,;:!?) is trimmed, so "I like #gamedev," tags "gamedev".
 * - Flat names: "/" is an ordinary character ("gamedev/abc" is one tag,
 *   no implied parent). Grouping is done at query time via glob:
 *   tag:"gamedev/*".
 * - Case-insensitive: "Godot" and "godot" are the same tag; the most
 *   frequently used casing becomes its display name.
 */

const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** Extract tags from a title: "#a b #c/d." -> ["a", "c/d"]. */
export const extractTags = (title: string): string[] =>
  title
    .split(/\s+/)
    .filter((word) => word.startsWith("#") && word.length > 1)
    .map((word) => word.slice(1).replace(TRAILING_PUNCTUATION, ""))
    .filter((tag) => tag.length > 0);

interface TagVariantEntry {
  total: number;
  variants: Map<string, number>;
}

/**
 * Build the suggestion index from bookmarks: keys are display casings
 * (most frequent variant), values are case-merged totals.
 */
export const buildTagIndex = (
  bookmarks: { title: string }[],
): Record<string, number> => {
  const byLower = new Map<string, TagVariantEntry>();

  for (const bookmark of bookmarks) {
    for (const tag of extractTags(bookmark.title)) {
      const key = tag.toLowerCase();
      let entry = byLower.get(key);
      if (!entry) {
        entry = { total: 0, variants: new Map() };
        byLower.set(key, entry);
      }
      entry.total += 1;
      entry.variants.set(tag, (entry.variants.get(tag) ?? 0) + 1);
    }
  }

  const index: Record<string, number> = {};
  for (const [key, entry] of byLower) {
    // Display = most frequent casing; ties -> shortest, then alphabetical.
    let best = key;
    let bestCount = -1;
    for (const [variant, count] of entry.variants) {
      const better =
        count > bestCount ||
        (count === bestCount &&
          (variant.length < best.length ||
            (variant.length === best.length && variant < best)));
      if (better) {
        best = variant;
        bestCount = count;
      }
    }
    index[best] = entry.total;
  }
  return index;
};
