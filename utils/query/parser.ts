import type { FilterToken, ParsedQuery, QueryToken } from "./types.ts";

/**
 * Scanner/parser for the query language.
 *
 * Token grammar:
 *   token    := "-"? (key ":")? value
 *   value    := quoted | bare
 *   quoted   := '"' [^"]* '"'
 *   bare     := [^\s]+
 *
 * Tokens are separated by whitespace. Quoted values may contain spaces.
 * `-` immediately before a token negates it.
 */

interface RawToken {
  negated: boolean;
  key: string | null;
  value: string;
  /** Value was written in quotes; preserved on re-serialization. */
  quoted: boolean;
  /** Unterminated quote — token is still being typed. */
  incomplete: boolean;
  start: number;
  end: number;
}

export const scan = (query: string): RawToken[] => {
  const tokens: RawToken[] = [];
  let i = 0;

  while (i < query.length) {
    if (/\s/.test(query.charAt(i))) {
      i++;
      continue;
    }

    const start = i;
    let negated = false;

    if (query[i] === "-") {
      negated = true;
      i++;
    }

    // Read key up to ':' (only when not quoted)
    let key: string | null = null;
    const keyMatch = /^[a-z_]+(?=:)/i.exec(query.slice(i));
    if (keyMatch) {
      key = keyMatch[0].toLowerCase();
      i += keyMatch[0].length + 1; // skip ':'
    }

    let value: string;
    let quoted: boolean;
    let incomplete: boolean;
    if (query[i] === '"') {
      quoted = true;
      const close = query.indexOf('"', i + 1);
      if (close === -1) {
        // Unterminated quote: take the rest.
        value = query.slice(i + 1);
        incomplete = true;
        i = query.length;
      } else {
        value = query.slice(i + 1, close);
        i = close + 1;
      }
    } else {
      const rest = query.slice(i);
      const bareMatch = /^\S+/.exec(rest);
      if (!bareMatch) continue; // lone '-' or 'key:' — no value
      value = bareMatch[0];
      quoted = false;
      incomplete = false;
      i += bareMatch[0].length;
    }

    tokens.push({ negated, key, value, quoted, incomplete, start, end: i });
  }

  return tokens;
};

/**
 * Parse a raw query into tokens.
 * Unknown keys are kept as filters — the engine treats them as non-matching
 * and the UI can flag them; this keeps roundtripping lossless.
 */
export const parseQuery = (query: string): ParsedQuery => {
  const tokens: QueryToken[] = scan(query).map((raw): QueryToken => {
    if (raw.key) {
      return {
        kind: "filter",
        key: raw.key,
        value: raw.value,
        negated: raw.negated,
        quoted: raw.quoted,
        incomplete: raw.incomplete,
        start: raw.start,
        end: raw.end,
      } satisfies FilterToken;
    }
    return {
      kind: "term",
      text: raw.value,
      negated: raw.negated,
      start: raw.start,
      end: raw.end,
    };
  });

  return { tokens, errors: [] };
};

/** Serialize a value: quote when it contains whitespace or is empty. */
export const serializeValue = (value: string): string =>
  /[\s]/.test(value) || value === "" ? `"${value}"` : value;

/** Serialize a single token back to its canonical text form. */
export const serializeToken = (token: QueryToken): string => {
  const prefix = token.negated ? "-" : "";
  if (token.kind === "term") return `${prefix}${token.text}`;
  if (token.incomplete) return `${prefix}${token.key}:"${token.value}`;
  const needsQuotes =
    token.quoted || /[\s]/.test(token.value) || token.value === "";
  const value = needsQuotes ? `"${token.value}"` : token.value;
  return `${prefix}${token.key}:${value}`;
};

/** Serialize a full parsed query back to a canonical string. */
export const serializeQuery = (tokens: QueryToken[]): string =>
  tokens.map(serializeToken).join(" ");

/** Remove the token that covers the given offset. Returns new query string. */
export const removeTokenAt = (query: string, offset: number): string => {
  const { tokens } = parseQuery(query);
  const token = tokens.find((t) => offset > t.start && offset <= t.end);
  if (!token) return query;
  return (
    query.slice(0, token.start) +
    query.slice(token.end).replace(/^\s+/, " ")
  ).replace(/^\s+|\s+$/g, "");
};

/**
 * Flip the negation of the token covering the given offset.
 * Returns null when no token covers the offset.
 */
export const invertTokenAt = (query: string, offset: number): string | null => {
  const { tokens } = parseQuery(query);
  const token = tokens.find((t) => offset > t.start && offset <= t.end);
  if (!token) return null;
  const flipped = { ...token, negated: !token.negated };
  const before = query.slice(0, token.start);
  const after = query.slice(token.end);
  const replacement = serializeToken(flipped);
  return before + replacement + after;
};
