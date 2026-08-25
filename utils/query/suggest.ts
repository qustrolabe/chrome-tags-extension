import { parseQuery } from "./parser.ts";
import { getKeySpec, KEY_SPECS } from "./registry.ts";
import { patternMatch, splitSegments } from "./glob.ts";
import {
  allNodes,
  childNames,
  descendantNames,
  resolveChain,
  type FolderSuggestNode,
} from "./folders.ts";
import type { FilterToken, ParsedQuery } from "./types.ts";
import type { FilterToken, ParsedQuery } from "./types.ts";

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
  /** tag -> bookmark count (keys are display casings) */
  tags: Record<string, number>;
  /** Folder tree for folder:/folder_strict: suggestions. */
  folderTree: FolderSuggestNode[];
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
  specKind: string,
  frag: Fragment,
  key: string,
  value: string,
): string => {
  // Text values default to quoted form; date/number templates stay bare.
  const needsQuotes =
    specKind === "text" || frag.quoted || /[\s]/.test(value) || value === "";
  const serialized = needsQuotes ? `"${value}"` : value;
  return `${frag.negated ? "-" : ""}${key}:${serialized}`;
};

/** Value suggestions for one key spec. */
const valueSuggestions = (
  key: string,
  frag: Fragment,
  data: SuggestData,
  /** Existing "key:value" pairs in the query (lowercased) to skip. */
  existing: Set<string>,
  /** Folder nodes that other folder tokens constrain suggestions to. */
  folderConstraintNodes: FolderSuggestNode[] | null,
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
    // Don't offer a value already present in the query for this key.
    if (existing.has(`${key}:${value.toLowerCase()}`)) return;
    out.push({
      type: "value",
      label: buildFilterText(spec.kind, frag, key, value),
      category,
      comment,
      replaceFrom: -1, // filled by caller
      replaceTo: -1,
      insert: buildFilterText(spec.kind, frag, key, value),
    });
  };

  if (spec.kind === "text") {
    const isFolderKey = key === "folder" || key === "folder_strict";

    if (key === "tag") {
      Object.entries(data.tags)
        .filter(([tag]) => tag.toLowerCase().startsWith(prefix))
        .sort(([, a], [, b]) => b - a)
        .forEach(([tag, count]) =>
          push(tag, `${count} bookmarks`),
        );
    } else if (isFolderKey) {
      // Split into completed chain segments + the partial segment being
      // typed (a trailing "/" means an empty partial).
      const endsWithSlash = frag.valuePrefix.endsWith("/");
      const segments = splitSegments(frag.valuePrefix);
      const partial = endsWithSlash
        ? ""
        : (segments[segments.length - 1] ?? "").toLowerCase();
      const completed = endsWithSlash ? segments : segments.slice(0, -1);
      const chainPrefix =
        completed.length > 0 ? completed.join("/") + "/" : "";

      // Scope candidates:
      // - inside a chain -> children of the resolved chain (anchored
      //   anywhere in the tree),
      // - constrained by another folder token -> children of those nodes,
      // - otherwise -> every folder name in the tree.
      let candidateNames: string[];
      if (completed.length > 0 || folderConstraintNodes) {
        const bases =
          completed.length > 0
            ? resolveChain(
                folderConstraintNodes ?? allNodes(data.folderTree),
                completed,
              )
            : folderConstraintNodes ?? [];
        candidateNames = childNames(bases);
      } else {
        candidateNames = descendantNames(data.folderTree);
      }

      candidateNames
        .filter((name) => name.toLowerCase().startsWith(partial))
        .sort()
        .forEach((name) =>
          push(chainPrefix + name, spec.description),
        );

      // "~" reaches top-level folders; it cannot collide with a real
      // folder name and isn't reachable via glob matching.
      if (
        completed.length === 0 &&
        !folderConstraintNodes &&
        partial === ""
      ) {
        push("~", "top-level folders");
      }
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

/**
 * Mixed suggestions for a BARE fragment (no key typed yet): matching keys,
 * tags, folders and — for number-like fragments — date/number templates
 * across keys, all merged into one relevance-ordered list.
 */
const bareSuggestions = (
  frag: Fragment,
  data: SuggestData,
  existing: Set<string>,
): Suggestion[] => {
  const prefix = frag.valuePrefix.toLowerCase();
  const neg = frag.negated ? "-" : "";
  const out: Suggestion[] = [];

  const pushToken = (
    tokenText: string,
    category: string,
    comment?: string,
  ) => {
    out.push({
      type: "value",
      label: tokenText,
      category,
      comment,
      replaceFrom: -1,
      replaceTo: -1,
      insert: tokenText,
    });
  };

  // Matching keys first.
  out.push(...keySuggestions(frag));

  // Tags by count.
  Object.entries(data.tags)
    .filter(([tag]) => tag.toLowerCase().startsWith(prefix))
    .sort(([, a], [, b]) => b - a)
    .forEach(([tag, count]) => {
      const text = `${neg}tag:"${tag}"`;
      if (!existing.has(`tag:${tag.toLowerCase()}`)) {
        pushToken(text, "tag", `${count} bookmarks`);
      }
    });

  // Folders (anywhere in the tree).
  descendantNames(data.folderTree)
    .filter((name) => name.toLowerCase().startsWith(prefix))
    .sort()
    .forEach((name) => {
      const text = `${neg}folder:"${name}"`;
      if (!existing.has(`folder:${name.toLowerCase()}`)) {
        pushToken(text, "folder", "in this folder or any subfolder");
      }
    });

  // Number-ish fragments also surface date/number templates across keys.
  if (/^[<>=]?\d/.test(prefix)) {
    DATE_TEMPLATES.forEach(({ value, comment }) => {
      if (value.startsWith(prefix)) {
        pushToken(`${neg}added:${value}`, "date", `added ${comment}`);
        pushToken(`${neg}last_used:${value}`, "date", `last used ${comment}`);
      }
    });
    NUMBER_TEMPLATES("visits").forEach(({ value, comment }) => {
      if (value.startsWith(prefix)) {
        pushToken(`${neg}visits:${value}`, "visits", comment);
        pushToken(`${neg}frecency:${value}`, "frecency", comment.replace("visits", "score"));
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

  /** A token is complete when it isn't an unterminated quoted value. */
  const isCompleteToken = (token: ParsedQuery["tokens"][number]) =>
    !(token.kind === "filter" && token.incomplete);

  // 1. Token under caret: caret anywhere from token start up to (but not
  // including) its end counts as inside -> actions + completions.
  // Incomplete tokens (e.g. typing inside `tag:"new`) are NOT "inside":
  // the user is mid-typing, so fragment/value completion mode applies.
  const covering = parsed.tokens.find(
    (token) =>
      caret >= token.start &&
      caret < token.end &&
      isCompleteToken(token),
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
    // Existing key:value pairs — INCLUDING the token under the caret,
    // whose value is already offered explicitly as the "current value"
    // suggestion below; without this it would appear twice.
    const existing = new Set(
      parsed.tokens
        .filter((t): t is FilterToken => t.kind === "filter")
        .map((t) => `${t.key}:${t.value.toLowerCase()}`),
    );

    // Other folder tokens in the query scope folder suggestions to their
    // subtree (e.g. with folder:"Projects" present, suggest only subfolders
    // of Projects).
    const folderConstraintNodes = resolveChain(
      allNodes(data.folderTree),
      parsed.tokens.flatMap((t) =>
        t.kind === "filter" &&
        t !== covering &&
        (t.key === "folder" || t.key === "folder_strict")
          ? splitSegments(t.value)
          : [],
      ),
    );

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
    const completions = valueSuggestions(
      covering.key,
      virtualFrag,
      data,
      existing,
      folderConstraintNodes,
    ).map((s) => ({
      ...s,
      replaceFrom: covering.start,
      replaceTo: covering.end,
    }));

    // Always offer the token's current value as-is ("keep this one").
    const coveringText = query.slice(covering.start, covering.end);
    const selfSuggestion: Suggestion | null = covering.value
      ? {
          type: "value",
          label: coveringText,
          category: getKeySpec(covering.key)?.label ?? covering.key,
          comment: "current value",
          replaceFrom: covering.start,
          replaceTo: covering.end,
          insert: coveringText,
        }
      : null;

    return [...actions, ...(selfSuggestion ? [selfSuggestion] : []), ...completions];
  }

  // 2. Fragment currently being typed (empty -> suggest all keys).
  const fragment = activeFragment(query, caret);

  // Caret right after a fully quoted value means the token is complete:
  // assume the user is starting a NEW token (insert with a space).
  // Unterminated quoted tokens are mid-typing -> completion mode instead.
  const afterQuotedToken = parsed.tokens.some(
    (token) =>
      token.kind === "filter" &&
      token.quoted &&
      !token.incomplete &&
      caret === token.end,
  );

  if (fragment.text === "" || afterQuotedToken) {
    return keySuggestions({
      negated: false,
      key: null,
      valuePrefix: "",
      quoted: false,
    }).map((s) => ({
      ...s,
      replaceFrom: caret,
      replaceTo: caret,
      insert: (afterQuotedToken && fragment.text !== "" ? " " : "") + s.insert,
    }));
  }

  const frag = parseFragment(fragment.text);

  // Tokens overlapping the fragment being typed are mid-edit — they must
  // not act as constraints or dedupe sources.
  const notBeingEdited = (t: FilterToken) =>
    t.start >= caret || t.end <= fragment.start;

  // Exclude values already present anywhere else in the query.
  const existing = new Set(
    parsed.tokens
      .filter((t): t is FilterToken => t.kind === "filter" && notBeingEdited(t))
      .map((t) => `${t.key}:${t.value.toLowerCase()}`),
  );

  // Folder tokens in the query scope folder suggestions to their subtree.
  const folderConstraintNodes = resolveChain(
    allNodes(data.folderTree),
    parsed.tokens.flatMap((t) =>
      t.kind === "filter" &&
      notBeingEdited(t) &&
      (t.key === "folder" || t.key === "folder_strict")
        ? splitSegments(t.value)
        : [],
    ),
  );

  if (frag.key === null) {
    return bareSuggestions(frag, data, existing).map((s) => ({
      ...s,
      replaceFrom: fragment.start,
      replaceTo: caret,
    }));
  }

  return valueSuggestions(frag.key, frag, data, existing, folderConstraintNodes).map((s) => ({
    ...s,
    replaceFrom: fragment.start,
    replaceTo: caret,
  }));
};
