import { describe, expect, test } from "bun:test";
import {
  matchesBounds,
  parseBounds,
  parseDuration,
} from "../../utils/query/bounds.ts";
import { globMatch } from "../../utils/query/glob.ts";

const DAY = 86_400_000;

describe("durations", () => {
  test("unit table", () => {
    expect(parseDuration("30min")).toBe(30 * 60_000);
    expect(parseDuration("4h")).toBe(4 * 3_600_000);
    expect(parseDuration("2d")).toBe(2 * DAY);
    expect(parseDuration("1w")).toBe(7 * DAY);
    expect(parseDuration("2mo")).toBeCloseTo(2 * 2_629_800_000);
    expect(parseDuration("1y")).toBeCloseTo(1 * 31_557_600_000);
  });

  test("invalid durations", () => {
    expect(parseDuration("10")).toBe(null); // missing unit
    expect(parseDuration("d")).toBe(null);
    expect(parseDuration("3x")).toBe(null);
    expect(parseDuration("")).toBe(null);
  });
});

describe("bounds parsing", () => {
  test("exact", () => {
    expect(parseBounds("123", { requireUnit: false })).toEqual([
      { op: "=", value: 123 },
    ]);
  });

  test("comparison", () => {
    expect(parseBounds(">10", { requireUnit: false })).toEqual([
      { op: ">", value: 10 },
    ]);
    expect(parseBounds("<=5.5", { requireUnit: false })).toEqual([
      { op: "<=", value: 5.5 },
    ]);
  });

  test("combined range in one token", () => {
    expect(parseBounds(">2mo<1y", { requireUnit: true })).toHaveLength(2);
  });

  test("dates require units", () => {
    expect(parseBounds("<7", { requireUnit: true })).toBe(null);
    expect(parseBounds("<7d", { requireUnit: true })).not.toBe(null);
  });

  test("numbers reject units", () => {
    expect(parseBounds(">10d", { requireUnit: false })).toBe(null);
  });

  test("garbage rejected", () => {
    expect(parseBounds(">10x<1d", { requireUnit: true })).toBe(null);
    expect(parseBounds("", { requireUnit: false })).toBe(null);
    expect(parseBounds("abc", { requireUnit: false })).toBe(null);
  });
});

describe("bounds matching", () => {
  test("all bounds must hold (AND)", () => {
    const bounds = parseBounds(">2<10", { requireUnit: false })!;
    expect(matchesBounds(5, bounds)).toBe(true);
    expect(matchesBounds(1, bounds)).toBe(false);
    expect(matchesBounds(10, bounds)).toBe(false); // exclusive
    expect(matchesBounds(11, bounds)).toBe(false);
  });

  test("inclusive operators work", () => {
    const bounds = parseBounds(">=2<=10", { requireUnit: false })!;
    expect(matchesBounds(2, bounds)).toBe(true);
    expect(matchesBounds(10, bounds)).toBe(true);
  });
});

describe("glob matching", () => {
  test("plain pattern = case-insensitive substring", () => {
    expect(globMatch("goo", "https://Google.com")).toBe(true);
    expect(globMatch("xyz", "https://google.com")).toBe(false);
  });

  test("* wildcard full-string match", () => {
    expect(globMatch("Pro*", "Projects")).toBe(true);
    expect(globMatch("pro*", "Projects")).toBe(true);
    expect(globMatch("*jects", "Projects")).toBe(true);
    expect(globMatch("Pro*", "My Projects")).toBe(false); // anchored
  });

  test("* matches empty and multiple chars", () => {
    expect(globMatch("a*z", "az")).toBe(true);
    expect(globMatch("a*z", "abcdez")).toBe(true);
  });

  test("regex metacharacters are escaped", () => {
    expect(globMatch("a.b", "axb")).toBe(false);
    expect(globMatch("a.b", "a.b")).toBe(true);
  });
});
