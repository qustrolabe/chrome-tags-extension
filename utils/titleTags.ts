/** A title word that is exactly a #tag token. */
const TAG_TOKEN = /^#[^\s#]+$/;

/**
 * Move all #tags to the right end of the title.
 *
 * Tags are plain tokens inside the title, so every tag editor is a title
 * editor; this keeps the non-tag words in their original order.
 */
export const sortTagsRight = (title: string): string => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const tags = words.filter((w) => TAG_TOKEN.test(w));
  const rest = words.filter((w) => !TAG_TOKEN.test(w));

  return [...rest, ...tags].join(" ");
};
