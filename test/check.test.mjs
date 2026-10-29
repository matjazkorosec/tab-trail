import { test } from "node:test";
import assert from "node:assert/strict";
import { runChecks, loadTree } from "../scripts/check.mjs";

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

const indexMjs = (hrefLen, titles) =>
  "export const HREF = " +
  JSON.stringify("x".repeat(hrefLen)) +
  ";\nexport const FEATURES = " +
  JSON.stringify(titles.map((t) => ({ title: t }))) +
  ";\n";

function base() {
  return new Map([
    ["package.json", JSON.stringify({ sizeBudget: 100 })],
    ["src/tab-trail.js", "var a = 1;\n"],
    ["data/x.json", "{}"],
    ["README.md", "Hello\n"],
    ["CHANGELOG.md", "# Changelog\n\n## Unreleased\n\n- Something\n\n## 1.0.0 (2026-10-29)\n\nFirst.\n"],
    ["dist/tab-trail.js", "built"],
    ["dist/index.mjs", indexMjs(50, ["Missed spots"])],
    ["docs/checks.md", "# Checks\n\n### 01 Missed spots\n\ntext\n"],
  ]);
}

function fresh(files) {
  const pick = (p) =>
    Object.fromEntries([...files].filter(([k]) => k.startsWith(p)).map(([k, v]) => [k.slice(p.length), v]));
  return { dist: pick("dist/"), docs: pick("docs/") };
}

const run = (files, opts = {}) =>
  runChecks(files, { srcChanged: false, labels: [], fresh: fresh(files), ...opts });

function one(failures, name) {
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.ok(failures[0].includes(name), failures[0]);
}

test("clean tree passes", () => {
  assert.deepEqual(run(base()), []);
});

test("check 1: em dash in src", () => {
  const f = base();
  f.set("src/tab-trail.js", "a " + EM + " b");
  one(run(f), "src/tab-trail.js");
});

test("check 1: en dash in a root markdown file", () => {
  const f = base();
  f.set("README.md", "a " + EN + " b");
  one(run(f), "README.md");
});

test("check 1: dash in .github markdown and data and docs", () => {
  const f = base();
  f.set(".github/PULL_REQUEST_TEMPLATE.md", EM);
  one(run(f), ".github/PULL_REQUEST_TEMPLATE.md");
  const g = base();
  g.set("data/x.json", EN);
  one(run(g), "data/x.json");
  const h = base();
  h.set("docs/checks.md", h.get("docs/checks.md") + EM);
  one(run(h), "docs/checks.md");
});

test("check 1: dash in a .github yml file", () => {
  const f = base();
  f.set(".github/workflows/ci.yml", "name: CI " + EN);
  one(run(f), ".github/workflows/ci.yml");
  const g = base();
  g.set(".github/ISSUE_TEMPLATE/bug.yml", "name: Bug " + EM);
  one(run(g), ".github/ISSUE_TEMPLATE/bug.yml");
});

test("check 2: backtick in src", () => {
  const f = base();
  f.set("src/tab-trail.js", "var a = `x`;");
  one(run(f), "src/tab-trail.js");
});

test("check 3: dist differs from a fresh build", () => {
  const f = base();
  const fr = fresh(f);
  fr.dist["tab-trail.js"] = "different";
  one(run(f, { fresh: fr }), "dist/tab-trail.js");
});

test("check 3: dist is missing a built file", () => {
  const f = base();
  const fr = fresh(f);
  fr.dist["extra.js"] = "x";
  one(run(f, { fresh: fr }), "dist/extra.js");
});

test("check 4: docs differ from a fresh docs run", () => {
  const f = base();
  const fr = fresh(f);
  fr.docs["checks.md"] = "other";
  one(run(f, { fresh: fr }), "docs/checks.md");
});

test("check 5: src changed with empty Unreleased", () => {
  const f = base();
  f.set("CHANGELOG.md", "# Changelog\n\n## Unreleased\n\n## 1.0.0 (2026-10-29)\n\nFirst.\n");
  one(run(f, { srcChanged: true }), "CHANGELOG.md");
});

test("check 5: label no-changelog skips it, src unchanged skips it", () => {
  const f = base();
  f.set("CHANGELOG.md", "# Changelog\n\n## Unreleased\n");
  assert.deepEqual(run(f, { srcChanged: true, labels: ["no-changelog"] }), []);
  assert.deepEqual(run(f, { srcChanged: false }), []);
});

test("check 5: Windows line endings still count bullets", () => {
  const f = base();
  f.set("CHANGELOG.md", "# Changelog\r\n\r\n## Unreleased\r\n\r\n- Something\r\n");
  assert.deepEqual(run(f, { srcChanged: true }), []);
});

test("check 6: HREF over the budget", () => {
  const f = base();
  f.set("dist/index.mjs", indexMjs(101, ["Missed spots"]));
  one(run(f), "package.json");
});

test("check 6: missing or invalid sizeBudget", () => {
  const f = base();
  f.set("package.json", "{}");
  one(run(f), "package.json");
  const g = base();
  g.set("package.json", JSON.stringify({ sizeBudget: "big" }));
  one(run(g), "package.json");
});

test("check 6: HREF unreadable", () => {
  const f = base();
  f.set("dist/index.mjs", "export const FEATURES = [];\n");
  one(run(f), "dist/index.mjs");
});

test("check 7: feature without a docs section", () => {
  const f = base();
  f.set("dist/index.mjs", indexMjs(50, ["Missed spots", "Brand new"]));
  one(run(f), "Brand new");
});

test("check 4: stale README block", () => {
  const f = base();
  f.set("README.md", "Top\n<!-- checks:start -->\nold\n<!-- checks:end -->\n");
  const fr = { ...fresh(f), readme: { checks: "new" } };
  one(run(f, { fresh: fr }), "README.md");
  f.set("README.md", "Top\n<!-- checks:start -->\nnew\n<!-- checks:end -->\n");
  assert.deepEqual(run(f, { fresh: fr }), []);
});

test("check 4: README without its block", () => {
  const f = base();
  one(run(f, { fresh: { ...fresh(f), readme: { checks: "new" } } }), "README.md");
});

test("the real tree passes", async () => {
  const { files, opts } = await loadTree({ srcChanged: false, labels: [] });
  assert.deepEqual(runChecks(files, opts), []);
});
