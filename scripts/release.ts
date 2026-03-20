#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const allowed = new Set(["major", "minor", "patch"]);
const input = process.argv[2];
const releaseAs = allowed.has(input) ? (input as "major" | "minor" | "patch") : null;

const bumpVersion = (type: "major" | "minor" | "patch") => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  let [major, minor, patch] = pkg.version.split(".").map(Number);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  const newVersion = `${major}.${minor}.${patch}`;
  pkg.version = newVersion;
  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  return newVersion;
};

const main = () => {
  if (!releaseAs) {
    console.error("Usage: bun run release <major|minor|patch>");
    process.exit(1);
  }

  const newVersion = bumpVersion(releaseAs);

  try {
    execSync(`git rev-parse v${newVersion}`, { stdio: "ignore" });
    console.error(`Tag v${newVersion} already exists!`);
    process.exit(1);
  } catch {
    // Tag does not exist
  }

  execSync("git add package.json");
  execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: "inherit" });
  execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: "inherit" });

  console.log(`Done: v${newVersion}`);
};

main();
