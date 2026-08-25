import { parseQuery, serializeQuery, serializeValue } from "./parser.ts";

/**
 * Query-string editing helpers.
 * Sidebars and UI chips use these to toggle tokens in the raw query,
 * which remains the single source of truth.
 */

const findToken = (
  query: string,
  key: string,
  value: string,
) => {
  const { tokens } = parseQuery(query);
  return tokens.find(
    (token) =>
      token.kind === "filter" &&
      token.key === key &&
      token.value.toLowerCase() === value.toLowerCase(),
  );
};

/**
 * Cycle a filter token in the query:
 * absent -> positive -> negative -> absent.
 */
export const cycleToken = (
  query: string,
  key: string,
  value: string,
): string => {
  const { tokens } = parseQuery(query);
  const index = tokens.findIndex(
    (token) =>
      token.kind === "filter" &&
      token.key === key &&
      token.value.toLowerCase() === value.toLowerCase(),
  );
  const existing = index === -1 ? undefined : tokens[index];

  if (!existing) {
    const tokenText = `${key}:${serializeValue(value)}`;
    return query.trim() === ""
      ? tokenText
      : `${query.trimEnd()} ${tokenText}`;
  }

  const rest = tokens.map((token, i) =>
    i === index ? { ...token, negated: !token.negated } : token,
  );
  if (!existing.negated) {
    // positive -> negative: keep in place
    return serializeQuery(rest);
  }
  // negative -> removed entirely
  return serializeQuery(rest.filter((_, i) => i !== index));
};

/** State of a key/value pair within the query. */
export const tokenState = (
  query: string,
  key: string,
  value: string,
): "positive" | "negative" | null => {
  const existing = findToken(query, key, value);
  if (!existing) return null;
  return existing.negated ? "negative" : "positive";
};

/** Append a raw token string to the end of the query. */
export const appendToken = (query: string, tokenText: string): string =>
  query.trim() === "" ? tokenText : `${query.trimEnd()} ${tokenText}`;

/**
 * Force a key/value pair into an exact state.
 * "positive" / "negative" upsert in place; null removes all matching tokens.
 */
export const setTokenState = (
  query: string,
  key: string,
  value: string,
  state: "positive" | "negative" | null,
): string => {
  let next = query;
  // Remove every occurrence first.
  for (;;) {
    const { tokens } = parseQuery(next);
    const index = tokens.findIndex(
      (token) =>
        token.kind === "filter" &&
        token.key === key &&
        token.value.toLowerCase() === value.toLowerCase(),
    );
    if (index === -1) break;
    const token = tokens[index];
    if (!token) break;
    next = (
      next.slice(0, token.start) +
      next.slice(token.end)
    ).replace(/\s{2,}/g, " ").trim();
  }
  if (state === null) return next;
  return appendToken(next, `${state === "negative" ? "-" : ""}${key}:${serializeValue(value)}`);
};
