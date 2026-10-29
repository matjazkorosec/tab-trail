import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { parseChangelog } from "./changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mitFor = (VERSION) => [
  "/*",
  " * Tab trail " + VERSION + ", https://matjazkorosec.com/tools/tab-trail",
  " *",
  " * MIT License",
  " *",
  " * Copyright (c) 2026 Matjaž Korošec",
  " *",
  " * Permission is hereby granted, free of charge, to any person obtaining a copy",
  " * of this software and associated documentation files (the \"Software\"), to deal",
  " * in the Software without restriction, including without limitation the rights",
  " * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
  " * copies of the Software, and to permit persons to whom the Software is",
  " * furnished to do so, subject to the following conditions:",
  " *",
  " * The above copyright notice and this permission notice shall be included in all",
  " * copies or substantial portions of the Software.",
  " *",
  " * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
  " * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  " * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  " * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  " * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
  " * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
  " * SOFTWARE.",
  " */",
].join("\n");

export function buildDist() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const VERSION = pkg.version;
  const UPDATED = pkg.updated;

  const source = readFileSync(join(root, "src/tab-trail.js"), "utf8");
  const CODE = source.split("__VERSION__").join(VERSION);
  const FILE = mitFor(VERSION) + "\n(function(){\n" + CODE.trim() + "\n})();\n";
  const HREF = "javascript:" + encodeURIComponent("(function(){" + CODE + "})();void 0");

  const readJson = (name) => JSON.parse(readFileSync(join(root, "data", name + ".json"), "utf8"));
  const features = readJson("features");
  const changes = parseChangelog(readFileSync(join(root, "CHANGELOG.md"), "utf8")).map((e) => ({
    v: e.v,
    t: e.summary,
  }));

  const consts = {
    VERSION,
    UPDATED,
    CODE,
    FILE,
    HREF,
    GROUPS: features.groups,
    FEATURES: features.items,
    KEYS: readJson("keys"),
    READ: readJson("read"),
    QUIET: readJson("quiet"),
    API: readJson("api"),
    LIMITS: readJson("limits"),
    VS: readJson("vs"),
    CHANGES: changes,
  };
  const types = {
    VERSION: "string",
    UPDATED: "string",
    CODE: "string",
    FILE: "string",
    HREF: "string",
    GROUPS: '{ id: "red" | "read" | "work" | "settings"; title: string }[]',
    FEATURES:
      '{ title: string; short: string; long: string; group: "red" | "read" | "work" | "settings"; wcag?: string }[]',
    KEYS: "{ title?: string; items: string[] }",
    READ: "{ title?: string; items: string[] }",
    QUIET: "{ title?: string; items: string[] }",
    API: "{ call: string; gives: string }[]",
    LIMITS: "string[]",
    VS: "string[]",
    CHANGES: "{ v: string; t: string }[]",
  };
  const mjs = Object.entries(consts)
    .map(([k, v]) => "export const " + k + " = " + JSON.stringify(v) + ";\n")
    .join("");
  const dts = Object.keys(consts)
    .map((k) => "export declare const " + k + ": " + types[k] + ";\n")
    .join("");

  return { "tab-trail.js": FILE, "index.mjs": mjs, "index.d.ts": dts };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const dist = join(root, "dist");
  mkdirSync(dist, { recursive: true });
  for (const [name, content] of Object.entries(buildDist())) writeFileSync(join(dist, name), content);
}
