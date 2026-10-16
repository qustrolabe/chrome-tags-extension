import { describe, expect, test } from "bun:test";
import { buildTagRows } from "../../utils/tagsuggest.ts";

const KNOWN = [
  { tag: "tech", count: 10 },
  { tag: "testing", count: 5 },
  { tag: "gamedev", count: 4 },
  { tag: "Godot", count: 3 },
];

describe("tag suggestions with an empty query", () => {
  test("lists everything, no create row", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "",
    });
    expect(rows).toHaveLength(4);
    expect(rows.some((r) => r.isNew)).toBe(false);
  });
});

describe("tag suggestions while typing", () => {
  test("prefix matches come before substring matches", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "te",
    });
    // "te" is itself new, so its create row leads; then the prefix matches.
    expect(rows.map((r) => r.tag)).toEqual(["te", "tech", "testing"]);
    expect(rows.map((r) => r.isNew)).toEqual([true, false, false]);
  });

  test("a substring-only match still appears", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "dev",
    });
    expect(rows.map((r) => r.tag)).toEqual(["dev", "gamedev"]);
  });

  test("an existing tag's prefix shows no create row", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "tech",
    });
    expect(rows.map((r) => r.tag)).toEqual(["tech"]);
  });

  test("matching is case-insensitive and keeps display casing", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "godot",
    });
    expect(rows.map((r) => r.tag)).toEqual(["Godot"]);
  });
});

describe("the create row", () => {
  test("leads the list when the query is genuinely new", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "rust",
    });
    expect(rows[0]).toEqual({ tag: "rust", count: 0, isNew: true });
  });

  test("is absent when the query exactly matches a known tag", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "tech",
    });
    expect(rows.some((r) => r.isNew)).toBe(false);
  });

  test("is absent when the tag is already on this bookmark", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(["tech"]),
      query: "TECH",
    });
    expect(rows.some((r) => r.isNew)).toBe(false);
  });

  test("a new tag is offered even when nothing matches", () => {
    const rows = buildTagRows({
      knownTags: KNOWN,
      currentTags: new Set(),
      query: "zzzz",
    });
    expect(rows).toEqual([{ tag: "zzzz", count: 0, isNew: true }]);
  });
});

describe("tag suggestions with nothing to suggest", () => {
  test("empty query and no known tags yields no rows", () => {
    expect(
      buildTagRows({ knownTags: [], currentTags: new Set(), query: "" }),
    ).toEqual([]);
  });
});