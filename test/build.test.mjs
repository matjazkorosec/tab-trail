import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VERSION, UPDATED, CODE, FILE, HREF } from "../dist/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src/tab-trail.js"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("points the license and the pinned copy at GitHub", () => {
  assert.equal(FILE.split('https://raw.githubusercontent.com/matjazkorosec/tab-trail/v" + VERSION + "/dist/tab-trail.js').length, 2);
  assert.ok(FILE.includes("MIT License, full text: https://github.com/matjazkorosec/tab-trail/blob/main/LICENSE */"));
  assert.ok(FILE.includes(" * Tab trail " + VERSION + ", https://matjazkorosec.com/tools/tab-trail\n"));
  assert.ok(!FILE.includes("matjazkorosec.com/tools/tab-trail.js"));
  assert.ok(!FILE.includes("matjazkorosec.com/tools/tab-trail-"));
});

test("keeps special characters", () => {
  assert.ok(CODE.includes("\\"));
  const decoded = decodeURIComponent(HREF.slice(11));
  const lines = source.split("\n").filter((l) => l.includes("$") || l.includes("%"));
  assert.ok(lines.length > 0);
  for (const line of lines) {
    const expected = line.split("__VERSION__").join(VERSION);
    assert.ok(decoded.includes(expected), expected);
    assert.ok(CODE.includes(expected), expected);
    assert.ok(FILE.includes(expected), expected);
  }
});

test("injects the version", () => {
  assert.ok(!CODE.includes("__VERSION__"));
  assert.ok(CODE.includes('var VERSION = "' + VERSION + '"'));
  assert.equal(VERSION, pkg.version);
  assert.equal(UPDATED, pkg.updated);
});

test("dist/tab-trail.js equals FILE", () => {
  assert.equal(readFileSync(join(root, "dist/tab-trail.js"), "utf8"), FILE);
});
