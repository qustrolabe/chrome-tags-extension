import { describe, expect, test } from "bun:test";
import {
  invertTokenAt,
  parseQuery,
  removeTokenAt,
  serializeQuery,
  serializeValue,
} from "../../utils/query/parser.ts";

describe("parser — scan", () => {
  test("parses bare term", () => {
    const { tokens } = parseQuery("google");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ kind: "term", text: "google", negated: false });
  });

  test("parses negated bare term", () => {
    const { tokens } = parseQuery("-google");
    expect(tokens[0]).toMatchObject({ kind: "term", text: "google", negated: true });
  });

  test("parses key filter without quotes", () => {
    const { tokens } = parseQuery("url:google");
    expect(tokens[0]).toMatchObject({
      kind: "filter",
      key: "url",
      value: "google",
      negated: false,
    });
  });

  test("parses key filter with quoted value containing spaces", () => {
    const { tokens } = parseQuery('title:"hello world"');
    expect(tokens[0]).toMatchObject({
      key: "title",
      value: "hello world",
    });
  });

  test("parses negated quoted filter", () => {
    const { tokens } = parseQuery('-tag:"web dev"');
    expect(tokens[0]).toMatchObject({
      key: "tag",
      value: "web dev",
      negated: true,
    });
  });

  test("complex query keeps order and offsets", () => {
    const query = 'url:"google" tag:"tech" -tag:"web" folder:"projects"';
    const { tokens } = parseQuery(query);
    expect(tokens.map((t) => t.kind)).toEqual([
      "filter",
      "filter",
      "filter",
      "filter",
    ]);
    expect(tokens.every((t) => query.slice(t.start, t.end).length > 0)).toBe(true);
    // token text round-trips to its slice
    expect(query.slice(tokens[2].start, tokens[2].end)).toBe('-tag:"web"');
  });

  test("multiple whitespace between tokens", () => {
    const { tokens } = parseQuery("  a   b\tc ");
    expect(
      tokens.map((t) => (t.kind === "term" ? t.text : t.value)),
    ).toEqual(["a", "b", "c"]);
  });

  test("unterminated quote consumes rest of input", () => {
    const { tokens } = parseQuery('tag:"unclosed rest');
    expect(tokens[0]).toMatchObject({ key: "tag", value: "unclosed rest" });
  });
});

describe("parser — serialize roundtrip", () => {
  test("roundtrip preserves tokens", () => {
    const query = 'url:google tag:"tech news" -visits:>10 last_used:<1w';
    const parsed = parseQuery(query);
    const canonical = serializeQuery(parsed.tokens);
    const reparsed = parseQuery(canonical);
    expect(reparsed.tokens).toHaveLength(parsed.tokens.length);
    reparsed.tokens.forEach((token, i) => {
      expect(token.kind).toBe(parsed.tokens[i].kind);
      expect(token.negated).toBe(parsed.tokens[i].negated);
      if (token.kind === "filter" && parsed.tokens[i].kind === "filter") {
        expect(token.key).toBe(parsed.tokens[i].key);
        expect(token.value).toBe(parsed.tokens[i].value);
      }
    });
  });

  test("values with spaces are quoted on serialize", () => {
    expect(serializeValue("a b")).toBe('"a b"');
    expect(serializeValue("ab")).toBe("ab");
    expect(serializeValue("")).toBe('""');
  });
});

describe("parser — editing", () => {
  test("removeTokenAt removes the covered token", () => {
    const query = 'tag:"tech" url:google';
    // caret inside the first token
    expect(removeTokenAt(query, 5)).toBe("url:google");
    expect(removeTokenAt(query, 10)).toBe("url:google");
    // caret inside second token
    expect(removeTokenAt(query, 14)).toBe('tag:"tech"');
  });

  test("removeTokenAt no-op when offset between tokens", () => {
    // "a b": offsets 0..1 = 'a', 2..3 = 'b'; offset 2 is b's start -> untouched
    expect(removeTokenAt("a b", 2)).toBe("a b");
  });

  test("invertTokenAt flips negation and preserves others", () => {
    const query = 'tag:"tech" -url:google';
    const inverted = invertTokenAt(query, 3)!;
    expect(inverted).toBe('-tag:"tech" -url:google');

    const inverted2 = invertTokenAt(inverted, inverted.length)!;
    expect(inverted2).toBe('-tag:"tech" url:google');
  });

  test("invertTokenAt returns null when no token under caret", () => {
    expect(invertTokenAt("tag:x", 100)).toBe(null);
    expect(invertTokenAt("", 0)).toBe(null);
  });
});

