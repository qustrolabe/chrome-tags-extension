import { describe, expect, test } from "bun:test";
import { parseUrlParams, formatUrlParam } from "../../utils/url.ts";

describe("url param parsing", () => {
  test("simple key/value pairs", () => {
    expect(parseUrlParams("https://example.com/?a=1&b=2")).toEqual([
      { key: "a", value: "1", bare: false },
      { key: "b", value: "2", bare: false },
    ]);
  });

  test("valueless pair is marked bare", () => {
    expect(parseUrlParams("https://example.com/?debug")).toEqual([
      { key: "debug", value: "", bare: true },
    ]);
  });

  test("bare and empty-value pairs are distinguishable", () => {
    const params = parseUrlParams("https://example.com/?a&b=");
    expect(params[0]?.bare).toBe(true);
    expect(params[1]?.bare).toBe(false);
    expect(params[1]?.value).toBe("");
  });

  test("percent-encoding is decoded", () => {
    expect(parseUrlParams("https://example.com/?q=a%20b&t=%2F")).toEqual([
      { key: "q", value: "a b", bare: false },
      { key: "t", value: "/", bare: false },
    ]);
  });

  test("plus decodes to space", () => {
    expect(parseUrlParams("https://example.com/?q=a+b")[0]?.value).toBe("a b");
  });

  test("malformed percent-encoding falls back to the raw text", () => {
    expect(parseUrlParams("https://example.com/?q=100%")[0]?.value).toBe("100%");
  });

  test("value containing = keeps everything after the first", () => {
    expect(parseUrlParams("https://example.com/?tok=a=b=c")[0]?.value).toBe(
      "a=b=c",
    );
  });

  test("empty and valueless pairs are skipped", () => {
    expect(parseUrlParams("https://example.com/?&a=1&&b=2&")).toHaveLength(2);
  });

  test("duplicate keys are all kept, in order", () => {
    expect(
      parseUrlParams("https://example.com/?tag=x&tag=y").map((p) => p.value),
    ).toEqual(["x", "y"]);
  });

  test("no query string yields nothing", () => {
    expect(parseUrlParams("https://example.com/page")).toEqual([]);
  });
});

describe("url params that cannot be parsed", () => {
  test("empty and whitespace-only input", () => {
    expect(parseUrlParams("")).toEqual([]);
    expect(parseUrlParams("   ")).toEqual([]);
  });

  test("mid-edit garbage does not throw", () => {
    expect(parseUrlParams("ht")).toEqual([]);
    expect(parseUrlParams("https://")).toEqual([]);
    expect(parseUrlParams("not a url at all")).toEqual([]);
  });

  test("non-http schemes still parse when they are real URLs", () => {
    expect(parseUrlParams("chrome-extension://abc/x.html?mode=dark")).toEqual([
      { key: "mode", value: "dark", bare: false },
    ]);
  });
});

describe("url param formatting", () => {
  test("key=value", () => {
    expect(formatUrlParam({ key: "a", value: "1", bare: false })).toBe("?a=1");
  });

  test("bare pair shows no =", () => {
    expect(formatUrlParam({ key: "debug", value: "", bare: true })).toBe(
      "?debug",
    );
  });

  test("explicit empty value collapses to the bare form", () => {
    expect(formatUrlParam({ key: "b", value: "", bare: false })).toBe("?b");
  });
});