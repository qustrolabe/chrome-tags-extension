import { describe, expect, test } from "bun:test";
import { applySuggestion, suggest } from "@queryfield/core";
import { appRegistry } from "../../utils/queryRegistry.ts";
import { tokenActions } from "../../utils/queryActions.ts";

const DATA = { tags: {}, folderTree: [] };

/** Suggestions for the token covering `caret`. */
const rows = (query: string, caret: number) =>
  suggest(query, caret, DATA, appRegistry, { tokenActions });

/** The "Convert to …" row, if this key has one. */
const convert = (query: string, caret: number) =>
  rows(query, caret).find((row) => row.action?.startsWith("convert:"));

describe("token actions — convert to the sibling key", () => {
  test("folder converts to folder_strict and back", () => {
    const query = 'folder:"Projects"';

    expect(convert(query, 8)?.label).toBe("Convert to folder strict");
    expect(convert(query, 8)?.category).toBe("folder strict");
    expect(applySuggestion(query, convert(query, 8)!)?.query).toBe(
      'folder_strict:"Projects"',
    );

    const back = 'folder_strict:"Projects"';

    expect(applySuggestion(back, convert(back, 8)!)?.query).toBe(
      'folder:"Projects"',
    );
  });

  test("last_used converts to last_visited and back", () => {
    expect(convert("last_used:<1w", 5)?.insert).toBe("last_visited:<1w");
    expect(convert("last_visited:<1w", 5)?.insert).toBe("last_used:<1w");
    expect(convert("last_used:<1w", 5)?.category).toBe("last visited");
    expect(convert("last_used:<1w", 5)?.tone).toBe("action");
  });

  test("negation and quoting survive the conversion", () => {
    expect(convert("-last_used:<1w", 6)?.insert).toBe("-last_visited:<1w");
    expect(convert('folder:"My Stuff"', 8)?.insert)
      .toBe('folder_strict:"My Stuff"');
  });

  test("other keys keep only the built-in rows", () => {
    const actions = rows("tag:tech", 4)
      .filter((row) => row.type === "action")
      .map((row) => row.action);

    expect(actions).toEqual(["invert", "remove"]);
  });
});
