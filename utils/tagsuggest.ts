/**
 * Suggestion rows for the quick-bookmark tag field.
 *
 * Pure and separately testable so the component can stay a thin shell: the
 * dropdown only ever shows what this returns, which makes "why is nothing
 * here?" answerable without reading React state.
 */

/** One dropdown row: either a tag that already exists, or a brand new one. */
export interface TagRow {
  /** Display casing, as indexed. New rows use the lowercased query. */
  tag: string;
  /** Bookmarks carrying the tag; 0 for a new row. */
  count: number;
  /** True for the "create this tag" entry. */
  isNew: boolean;
}

export interface TagSuggestInput {
  /** Display-cased tags with counts, e.g. `buildTagIndex` output. */
  knownTags: readonly { tag: string; count: number }[];
  /** Lowercased tags already present on this bookmark. */
  currentTags: ReadonlySet<string>;
  /** Text from the input, trimmed with any leading `#` already stripped. */
  query: string;
}

/**
 * Build the dropdown contents. Order is: the "create" row (when the query is
 * genuinely new), then prefix matches, then substring matches.
 *
 * The create row leads deliberately — typing a new name and pressing Enter
 * should do the obvious thing without arrowing first. Exact matches are
 * treated as existing tags, so Enter toggles instead of creating a dupe.
 */
export const buildTagRows = ({
  knownTags,
  currentTags,
  query,
}: TagSuggestInput): TagRow[] => {
  const q = query.toLowerCase();

  const isKnown = knownTags.some((e) => e.tag.toLowerCase() === q);
  const canCreate = !!q && !isKnown && !currentTags.has(q);

  const prefix: TagRow[] = [];
  const loose: TagRow[] = [];
  for (const { tag, count } of knownTags) {
    const lower = tag.toLowerCase();
    if (!q || lower.startsWith(q)) prefix.push({ tag, count, isNew: false });
    else if (lower.includes(q)) loose.push({ tag, count, isNew: false });
  }

  const matches = [...prefix, ...loose];
  return canCreate ? [{ tag: q, count: 0, isNew: true }, ...matches] : matches;
};