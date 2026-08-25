import { describe, expect, test } from "bun:test";
import { extractTags, buildTagIndex } from "../../utils/query/tags.ts";

describe("tag extraction", () => {
  test("basic hashtags", () => {
    expect(extractTags("Some page #tech news")).toEqual(["tech"]);
  });

  test("slash is part of the name (flat model)", () => {
    expect(extractTags("#gamedev/abc")).toEqual(["gamedev/abc"]);
  });

  test("trailing punctuation is trimmed", () => {
    expect(extractTags("nice #gamedev, really #web!")).toEqual([
      "gamedev",
      "web",
    ]);
  });

  test("lone # is not a tag", () => {
    expect(extractTags("hash # only")).toEqual([]);
  });

  test("no tags", () => {
    expect(extractTags("just a title")).toEqual([]);
  });
});

describe("tag index (case merging)", () => {
  test("Godot and godot merge into one entry", () => {
    const idx = buildTagIndex([
      { title: "#godot a" },
      { title: "#Godot b" },
      { title: "#godot c" },
      { title: "#unrelated" },
    ]);
    expect(Object.keys(idx).filter((k) => k.toLowerCase() === "godot"))
      .toHaveLength(1);
    const key = Object.keys(idx).find((k) => k.toLowerCase() === "godot")!;
    expect(idx[key]).toBe(3);
  });

  test("display casing = most frequent variant", () => {
    // lowercase used twice, TitleCase once
    const idx = buildTagIndex([
      { title: "#godot" },
      { title: "#godot" },
      { title: "#Godot" },
    ]);
    expect(Object.keys(idx)).toEqual(["godot"]);
  });
});
