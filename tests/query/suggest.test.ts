import { describe, expect, test } from "bun:test";
import { cycleToken, tokenState } from "../../utils/query/editing.ts";
import { suggest } from "../../utils/query/suggest.ts";

const DATA = {
  tags: { tech: 30, news: 12, new_notes: 4, new_ideas: 2 },
  folderNames: ["Bookmarks Bar", "Projects", "dev", "design"],
};

describe("editing — cycleToken / tokenState", () => {
  test("absent -> positive", () => {
    expect(cycleToken("", "tag", "tech")).toBe("tag:tech");
    const q = cycleToken("url:x", "tag", "tech");
    expect(q).toBe("url:x tag:tech");
  });

  test("positive -> negative", () => {
    expect(cycleToken("tag:tech", "tag", "tech")).toBe("-tag:tech");
  });

  test("negative -> removed", () => {
    expect(cycleToken("-tag:tech", "tag", "tech")).toBe("");
  });

  test("cycle preserves other tokens", () => {
    const q = 'url:"a b" tag:tech visits:>5';
    expect(cycleToken(q, "tag", "tech"))
      .toBe('url:"a b" -tag:tech visits:>5');
    expect(cycleToken("-tag:tech", "tag", "tech")).toBe("");
  });

  test("tokenState reflects the cycle", () => {
    let q = "";
    expect(tokenState(q, "tag", "tech")).toBe(null);
    q = cycleToken(q, "tag", "tech");
    expect(tokenState(q, "tag", "tech")).toBe("positive");
    q = cycleToken(q, "tag", "tech");
    expect(tokenState(q, "tag", "tech")).toBe("negative");
    q = cycleToken(q, "tag", "tech");
    expect(tokenState(q, "tag", "tech")).toBe(null);
  });
});

describe("suggest — keys", () => {
  test("empty fragment suggests all keys right away", () => {
    const s = suggest("", 0, DATA);
    expect(s.length).toBeGreaterThanOrEqual(5);
    expect(s.every((x) => x.type === "key")).toBe(true);
    expect(s.some((x) => x.label === "tag:")).toBe(true);
    // insertion point is the caret itself
    expect(s[0].replaceFrom).toBe(0);
    expect(s[0].replaceTo).toBe(0);
  });

  test("prefix suggests matching keys with descriptions and capsule", () => {
    const s = suggest("ur", 2, DATA);
    expect(s.map((x) => x.label)).toContain("url:");
    const url = s.find((x) => x.label === "url:")!;
    expect(url.category).toBe("url");
    expect(url.comment).toContain("URL");
    expect(url.insert).toBe('url:"');
  });

  test("negated key prefix keeps the dash", () => {
    const s = suggest("-ta", 3, DATA);
    expect(s.some((x) => x.label === "-tag:" && x.insert === '-tag:"'))
      .toBe(true);
  });

  test("replace range covers only the typed fragment", () => {
    const query = "abc ur";
    const caret = query.length;
    const s = suggest(query, caret, DATA);
    expect(s[0].replaceFrom).toBe(4);
    expect(s[0].replaceTo).toBe(caret);
  });
});

describe("suggest — values from real data", () => {
  test("tags filtered by prefix, sorted by count, with comment", () => {
    const s = suggest("tag:new", 7, DATA);
    const labels = s.map((x) => x.label);
    expect(labels).toContain("tag:new_notes");
    expect(labels).toContain("tag:new_ideas");
    // sorted by count desc
    const notesIdx = labels.indexOf("tag:new_notes");
    const ideasIdx = labels.indexOf("tag:new_ideas");
    expect(notesIdx).toBeLessThan(ideasIdx);
    expect(s[0].comment).toMatch(/\d+ bookmarks/);
  });

  test("folders suggest names with depth description comment", () => {
    const sIn = suggest('in:"Pro', 7, DATA);
    expect(sIn.some((x) => x.insert?.includes("Projects"))).toBe(true);
    expect(sIn[0].comment).toContain("subfolder");

    const sFolder = suggest('folder:"Pro', 11, DATA);
    expect(sFolder.some((x) => x.insert?.includes("Projects"))).toBe(true);
    expect(sFolder[0].comment).toContain("directly");
  });

  test("multi-segment chain completes last segment", () => {
    // user typed in:"dev/ — should complete subfolder names under dev
    const s = suggest('in:"dev/de', 10, DATA);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].insert).toBe('in:"dev/design"');
  });

  test("dates get premade templates with grey comments", () => {
    const s = suggest("last_used:", 10, DATA);
    expect(s.some((x) => x.insert === 'last_used:<1d')).toBe(true);
    const week = s.find((x) => x.insert === "last_used:<1w")!;
    expect(week.comment).toBeTruthy();
    expect(week.category).toBe("date");
  });

  test("numbers get premade templates", () => {
    const s = suggest("visits:", 7, DATA);
    expect(s.some((x) => x.insert === "visits:>10")).toBe(true);
    expect(s.every((x) => x.category === "visits")).toBe(true);
  });

  test("value replace range covers key:value fragment", () => {
    const query = "foo tag:new";
    const caret = query.length;
    const s = suggest(query, caret, DATA);
    for (const suggestion of s) {
      expect(suggestion.replaceFrom).toBe(4);
      expect(suggestion.replaceTo).toBe(caret);
    }
  });
});

describe("suggest — token actions (caret inside existing token)", () => {
  test("caret at token start counts as inside the token", () => {
    const s = suggest('tag:"random"', 0, DATA);
    expect(s[0].type).toBe("action");
    expect(s[0].action).toBe("invert");
    expect(s[1].action).toBe("remove");
  });

  test("caret right after a closed quote assumes a NEW token", () => {
    const query = 'tag:"random"';
    const s = suggest(query, query.length, DATA);
    expect(s[0].type).toBe("key");
    const url = s.find((x) => x.label === "url:")!;
    // separating space is included in the insertion
    expect(url.insert).toBe(' url:"');
    expect(url.replaceFrom).toBe(query.length);
    expect(url.replaceTo).toBe(query.length);
  });

  test("caret inside an OPEN quote keeps completion mode", () => {
    const s = suggest('in:"dev/de', 10, DATA);
    expect(s[0].type).toBe("value");
    expect(s[0].insert).toBe('in:"dev/design"');
  });

  test("caret at end of UNQUOTED value keeps completion mode", () => {
    const s = suggest("tag:new", 7, DATA);
    expect(s[0].type).toBe("value");
    expect(s.some((x) => x.insert?.includes("new_notes"))).toBe(true);
  });

  test("first two suggestions are invert & remove", () => {
    const query = 'tag:"tech" url:x';
    const caret = 6; // inside first token
    const s = suggest(query, caret, DATA);

    expect(s[0].type).toBe("action");
    expect(s[0].action).toBe("invert");
    expect(s[1].type).toBe("action");
    expect(s[1].action).toBe("remove");

    // positive token offers "Make negative"
    expect(s[0].label).toBe("Make negative");
  });

  test("negative token offers Make positive", () => {
    const s = suggest("-tag:tech", 4, DATA);
    expect(s[0].label).toBe("Make positive");
  });

  test("actions target exactly the covered token", () => {
    const query = "aaa tag:tech";
    const caret = 8;
    const s = suggest(query, caret, DATA);
    expect(s[0].replaceFrom).toBe(4);
    expect(s[0].replaceTo).toBe(query.length);
  });

  test("rest of list completes the partial value", () => {
    // caret right after "new" inside tag:"new"
    const query = 'tag:"new"';
    const caret = 8; // between w and closing quote
    const s = suggest(query, caret, DATA);
    const completions = s.filter((x) => x.type === "value");
    expect(completions.map((c) => c.insert))
      .toContain('tag:"new_notes"');
    // don't offer what's already fully typed
    expect(
      completions.find((c) => c.replaceFrom === 0 && c.replaceTo === caret)
        ?.insert,
    ).not.toBe('tag:"new"'.slice(0, caret));
  });
});
