import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseChangelog, unreleased } from "../scripts/changelog.mjs";
import { buildDocs } from "../scripts/docs.mjs";
import { FEATURES, GROUPS, CHANGES } from "../dist/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const sample = "# Changelog\n\n## Unreleased\n\n## 1.0.0 (2026-10-29)\n\nFirst public release: every Tab stop in order.\n";
const entry = { v: "1.0.0", date: "2026-10-29", summary: "First public release: every Tab stop in order.", bullets: [] };

test("parses the changelog", () => {
  assert.deepEqual(parseChangelog(sample), [entry]);
  assert.deepEqual(parseChangelog(sample.replace(/\n/g, "\r\n")), [entry]);
});

test("skips Unreleased", () => {
  const md = "# Changelog\n\n## Unreleased\n\n- Draft thing\n- Another\n\n## 1.0.0 (2026-10-29)\n\nSummary here.\n\n- Detail\n";
  assert.deepEqual(parseChangelog(md), [{ v: "1.0.0", date: "2026-10-29", summary: "Summary here.", bullets: ["Detail"] }]);
  assert.deepEqual(unreleased(md), ["Draft thing", "Another"]);
  assert.deepEqual(unreleased(sample), []);
});

test("CHANGES matches the changelog", () => {
  const md = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  assert.deepEqual(CHANGES, parseChangelog(md).map((e) => ({ v: e.v, t: e.summary })));
  assert.equal(CHANGES[0].v, pkg.version);
});

test("FEATURES has a valid shape", () => {
  assert.ok(FEATURES.length >= 1);
  const ids = GROUPS.map((g) => g.id);
  assert.ok(FEATURES.every((f) => ids.includes(f.group)));
  assert.ok(FEATURES.filter((f) => f.group === "red").every((f) => f.wcag));
  assert.equal(new Set(FEATURES.map((f) => f.title)).size, FEATURES.length);
});

test("placeholders stay in data, are filled in docs", () => {
  const data = readdirSync(join(root, "data")).map((f) => readFileSync(join(root, "data", f), "utf8")).join("\n");
  assert.match(data, /\bVERSION\b/);
  const docs = readdirSync(join(root, "docs")).map((f) => readFileSync(join(root, "docs", f), "utf8")).join("\n");
  for (const word of ["CHARS", "LINES", "VERSION", "RED", "ALL", "HELP"]) {
    assert.doesNotMatch(docs, new RegExp("\\b" + word + "\\b"));
  }
  assert.ok(![...docs].some((c) => c.charCodeAt(0) === 0x2013 || c.charCodeAt(0) === 0x2014));
});

test("docs are current", async () => {
  const made = await buildDocs();
  const names = readdirSync(join(root, "docs")).sort();
  assert.deepEqual(Object.keys(made).sort(), names);
  for (const [name, content] of Object.entries(made)) {
    assert.equal(readFileSync(join(root, "docs", name), "utf8"), content);
  }
});
