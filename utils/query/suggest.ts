import { parseQuery } from "./parser.ts";
import { getKeySpec, KEY_SPECS } from "./registry.ts";
import type { ParsedQuery } from "./types.ts";

/**
 * Caret-aware suggestion engine.
 *
 * Modes (by input caret position):
 * - Over an existing token -> [Invert, Remove] actions first, then value
 *   completions for that token's partial value (e.g. tag:"new" -> new_notes).
 * - Typing a key prefix (`tag`, `-ur`) -> matching key suggestions.
 * - Typing a value after `key:` -> real-data + premade template suggestions,
 *   each carrying a category capsule and grey explanatory comment.
 */

export interface SuggestData {
  /** tag -> bookmark count */
  tags: Record<string, number>;
  /** All distinct folder names in the tree. */
  folderNames: string[];
}

export interface Suggestion {
  type: "action" | "key" | "value";
  /** For actions: what to do with the token under the caret. */
  action?: "invert" | "remove";
  /** Main display text. */
  label: string;
  /** Capsule text in front, e.g. "tag", "date". */
  category?: string;
  /** Grey explanatory comment shown on the side. */
  comment?: string;
  /**
   * Replace query[replaceFrom..replaceTo] with `insert` on accept.
   * Actions ignore this (they rewrite the query themselves).
   */
  replaceFrom: number;
  replaceTo: number;
  insert?: string;
}

const DATE_TEMPLATES: { value: string; comment: string }[] = [
  { value: "<1d", comment: "within 24 hours" },
  { value: "<3d", comment: "last 3 days" },
  { value: "<1w", comment: "this week" },
  { value: "<1mo", comment: "this month" },
  { value: "<1y", comment: "this year" },
  { value: ">1mo", comment: "older than a month" },
  { value: ">1y", comment: "older than a year" },
  { value: ">2mo<1y", comment: "between 2 months and a year old" },
];

const NUMBER_TEMPLATES = (unit: string): { value: string; comment: string }[] => [
  { value: ">10", comment: `more than 10 ${unit}` },
  { value: ">100", comment: `more than 100 ${unit}` },
  { value: "<5", comment: `fewer than 5 ${unit}` },
  { value: "=0", comment: `zero ${unit}` },
];

const MAX_SUGGESTIONS = 12;

/** Locate the raw fragment being typed right before the caret. */
const activeFragment = (
  query: string,
  caret: number,
): { start: number; text: string } => {
  const upto = query.slice(0, caret);
  const ws = Math.max(
    upto.lastIndexOf(" "),
    upto.lastIndexOf("\t"),
    upto.lastIndexOf("\n"),
  );
  return { start: ws + 1, text: upto.slice(ws + 1) };
};

interface Fragment {
  negated: boolean;
  key: string | null;
  valuePrefix: string;
  quoted: boolean;
}

const parseFragment = (text: string): Fragment => {
  let rest = text;
  let negated = false;
  if (rest.startsWith("-")) {
    negated = true;
    rest = rest.slice(1);
  }
  const colon = rest.indexOf(":");
  if (colon === -1) {
    return { negated, key: null, valuePrefix: rest, quoted: false };
  }
  const key = rest.slice(0, colon).toLowerCase();
  let valuePrefix = rest.slice(colon + 1);
  let quoted = false;
  if (valuePrefix.startsWith('"')) {
    quoted = true;
    valuePrefix = valuePrefix.slice(1);
  }
  return { negated, key, valuePrefix, quoted };
};

const buildFilterText = (
  frag: Fragment,
  key: string,
  value: string,
): string => {
  const needsQuotes = frag.quoted || /[\s]/.test(value) || value === "";
  const serialized = needsQuotes ? `"${value}"` : value;
  return `${frag.negated ? "-" : ""}${key}:${serialized}`;
};

/** Value suggestions for one key spec. */
const valueSuggestions = (
  key: string,
  frag: Fragment,
  data: SuggestData,
): Suggestion[] => {
  const spec = getKeySpec(key);
  if (!spec) return [];
  const prefix = frag.valuePrefix.toLowerCase();
  const out: Suggestion[] = [];

  const push = (
    value: string,
    comment?: string,
    category: string = spec.label,
  ) => {
    out.push({
      type: "value",
      label: buildFilterText(frag, key, value),
      category,
      comment,
      replaceFrom: -1, // filled by caller
      replaceTo: -1,
      insert: buildFilterText(frag, key, value),
    });
  };

  if (spec.kind === "text") {
    const isFolderKey = key === "folder" || key === "in";
    // Multi-segment chains: only complete the last segment.
    const segments = frag.valuePrefix.split("/");
    const lastSegment = (segments[segments.length - 1] ?? "").toLowerCase();

    if (key === "tag") {
      Object.entries(data.tags)
        .filter(([tag]) => tag.toLowerCase().startsWith(prefix))
        .sort(([, a], [, b]) => b - a)
        .forEach(([tag, count]) =>
          push(tag, `${count} bookmarks`),
        );
    } else if (isFolderKey) {
      // Complete against the accumulated chain prefix.
      const chainPrefix =
        segments.length > 1 ? segments.slice(0, -1).join("/") + "/" : "";
      data.folderNames
        .filter((name) => name.toLowerCase().startsWith(lastSegment))
        .sort()
        .forEach((name) =>
          push(chainPrefix + name, spec.description),
        );
    } else {
      // url/title: no meaningful static sources; offer wildcard hint.
      if (prefix === "") {
        push(`*${prefix}`, "use * as wildcard");
      }
    }
  } else if (spec.kind === "date") {
    DATE_TEMPLATES.forEach(({ value, comment }) => {
      if (!prefix || value.toLowerCase().startsWith(prefix)) {
        push(value, comment, "date");
      }
    });
  } else {
    const unit = key === "visits" ? "visits" : key === "id" ? "" : "score";
    NUMBER_TEMPLATES(unit).forEach(({ value, comment }) => {
      if (!prefix || value.startsWith(prefix)) {
        push(value, comment, spec.label);
      }
    });
  }

  return out.slice(0, MAX_SUGGESTIONS);
};

/** Key suggestions for a typed prefix like `tag` / `-ur`. */
const keySuggestions = (frag: Fragment): Suggestion[] => {
  const prefix = (frag.valuePrefix ?? "").toLowerCase();
  return KEY_SPECS.filter((spec) => spec.key.startsWith(prefix))
    .slice(0, MAX_SUGGESTIONS)
    .map((spec) => ({
      type: "key" as const,
      label: `${frag.negated ? "-" : ""}${spec.key}:`,
      category: spec.label,
      comment: spec.description,
      replaceFrom: -1,
      replaceTo: -1,
      insert: `${frag.negated ? "-" : ""}${spec.key}:"`,
    }));
};

/**
 * Compute suggestions for the given query and caret offset.
 */
export const suggest = (
  query: string,
  caret: number,
  data: SuggestData,
): Suggestion[] => {
  const parsed: ParsedQuery = parseQuery(query);

  // 1. Token under caret (caret strictly inside, not at very end of query)?
  const covering = parsed.tokens.find(
    (token) => caret > token.start && caret < token.end,
  );

  if (covering && covering.kind === "filter") {
    const actions: Suggestion[] = [
      {
        type: "action",
        action: "invert",
        label: covering.negated ? "Make positive" : "Make negative",
        category: covering.key,
        comment: covering.negated
          ? "include matching items"
          : "exclude matching items",
        replaceFrom: covering.start,
        replaceTo: covering.end,
      },
      {
        type: "action",
        action: "remove",
        label: "Remove",
        category: covering.key,
        comment: "delete this filter from the query",
        replaceFrom: covering.start,
        replaceTo: covering.end,
      },
    ];
    // Value completions for the partial value inside this token.
    const innerCaret = caret - covering.start;
    const tokenText = query.slice(covering.start, covering.end);
    const frag = parseFragment(tokenText);
    const virtualFrag: Fragment = {
      ...frag,
      valuePrefix: frag.valuePrefix.slice(
        0,
        Math.max(0, innerCaret -
          (tokenText.indexOf(":") + 1 + (frag.quoted ? 1 : 0))),
      ),
    };
    const completions = valueSuggestions(covering.key, virtualFrag, data)
      .map((s) => ({
        ...s,
        replaceFrom: covering.start,
        replaceTo: covering.end,
      }))
      .filter((s) => s.insert !== query.slice(covering.start, covering.end));
    return [...actions, ...completions];
  }

  // 2. Fragment currently being typed.
  const fragment = activeFragment(query, caret);
  if (fragment.text === "") return [];

  const frag = parseFragment(fragment.text);

  if (frag.key === null) {
    return keySuggestions(frag).map((s) => ({
      ...s,
      replaceFrom: fragment.start,
      replaceTo: caret,
    }));
  }

  return valueSuggestions(frag.key, frag, data).map((s) => ({
    ...s,
    replaceFrom: fragment.start,
    replaceTo: caret,
  }));
};
