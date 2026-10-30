import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://matjazkorosec.com/tools/tab-trail";
const NOTE = "Generated from data/. Edit the files in data/, then run `npm run docs`.";

const showId = (title) =>
  "show-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const TEST = [
  'import { readFileSync } from "node:fs";',
  'import { test, expect } from "@playwright/test";',
  "",
  'const script = readFileSync("tests/tab-trail.js", "utf8");',
  "",
  'test("Tab reaches everything", async ({ page }) => {',
  "  test.setTimeout(300_000);",
  '  await page.goto("http://localhost:5173/");',
  "  await page.evaluate(script);",
  '  await page.evaluate(() => window.__tabTrail.play({ ignore: [".third-party-widget"] }));',
  "  const { total } = await page.evaluate(() => window.__tabTrail.state());",
  '  for (let i = 0; i <= total; i++) await page.keyboard.press("Tab");',
  '  for (let i = 0; i <= total; i++) await page.keyboard.press("Shift+Tab");',
  "  const report = await page.evaluate(() => window.__tabTrail.report());",
  '  await test.info().attach("tab-trail-report.txt", { body: report, contentType: "text/plain" });',
  "  const { done, untested } = await page.evaluate(() => window.__tabTrail.state());",
  '  console.log("Not tested:", untested.join(", ") || "none");',
  "  const problems = await page.evaluate(() => window.__tabTrail.problems());",
  "  expect(done).toBe(true);",
  "  expect(problems.map((p) => `${p.check}: ${p.selector}`)).toEqual([]);",
  "});",
  "",
  "type Problem = { id: string; check: string; wcag: string | null; selector: string | null; html: string | null; component: string | null; fix: string; verify: string };",
  "type Line = { time: string; result: string; check: string; wcag: string | null; text: string; fixed: boolean; selector: string | null; stop: number | null };",
  "",
  "declare global {",
  "  interface Window {",
  "    __tabTrail: {",
  "      version: string;",
  "      play(options?: { ignore?: string[]; delay?: number }): Promise<string>;",
  "      problems(): Problem[];",
  "      report(): string;",
  "      log(): Line[];",
  "      state(): { walked: number; total: number; done: boolean; untested: string[] };",
  "      close(): void;",
  "    };",
  "  }",
  "}",
].join("\n");

const STEP_READ = { title: "Press Tab, or press Play", rows: ["Play it", "Log"] };
const STEP_AI = { title: "Hand it to your AI", rows: ["Copy for AI"] };

function pageOrder(FEATURES) {
  const pick = (t) => FEATURES.find((f) => f.title === t);
  const lifted = [...STEP_READ.rows, ...STEP_AI.rows];
  const red = FEATURES.filter((f) => f.group === "red");
  const rest = FEATURES.filter((f) => f.group !== "red" && !lifted.includes(f.title));
  return [...STEP_READ.rows.map(pick), ...red, ...STEP_AI.rows.map(pick), ...rest];
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function fillReadme(text, blocks) {
  let out = text;
  const missing = [];
  for (const [name, body] of Object.entries(blocks)) {
    const re = new RegExp("(<!-- " + escape(name) + ":start -->)[\\s\\S]*?(<!-- " + escape(name) + ":end -->)");
    if (!re.test(out)) missing.push(name);
    else out = out.replace(re, (m, a, b) => a + "\n" + body + "\n" + b);
  }
  return { text: out, missing };
}

export async function readmeBlocks() {
  const lib = await import(pathToFileURL(join(root, "dist/index.mjs")).href + "?t=" + Date.now());
  const { HREF, FEATURES, API } = lib;
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const chars = HREF.length.toLocaleString("en-US");
  const raw = "https://raw.githubusercontent.com/matjazkorosec/tab-trail/v" + pkg.version + "/dist/tab-trail.js";
  const order = pageOrder(FEATURES);
  const red = FEATURES.filter((f) => f.group === "red");
  return {
    console:
      "Copy [`dist/tab-trail.js`](" +
      raw +
      "). On your site press F12, or Cmd+Option+I on a Mac (Cmd+Option+C in Safari), open Console and paste. If it asks, type allow pasting, press Enter, and paste again.",
    firefox:
      "Firefox can't store a bookmark longer than 65,536 characters, and the Tab trail bookmark is " +
      chars +
      ". In Firefox, paste the script in the console instead.",
    checks: red
      .map((f) => "- **" + String(order.indexOf(f) + 1).padStart(2, "0") + " " + f.title + "** (WCAG " + f.wcag + "): " + f.long + " [See it](" + SITE + "#" + showId(f.title) + ")")
      .join("\n"),
    api: API.map((a) => "- `" + a.call + "`: " + a.gives.replace(/\bVERSION\b/g, pkg.version)).join("\n"),
    test:
      "Save the script in your repo once, so every CI run uses the version you tested:\n\n```sh\ncurl -o tests/tab-trail.js " +
      raw +
      "\n```\n\nThen load it with `page.evaluate`, so a strict CSP or Trusted Types don't block it:\n\n```ts\n" +
      TEST +
      "\n```",
  };
}

export async function buildDocs() {
  const lib = await import(pathToFileURL(join(root, "dist/index.mjs")).href + "?t=" + Date.now());
  const { HREF, FILE, FEATURES, GROUPS, KEYS, READ, QUIET, API, LIMITS, VS } = lib;
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const values = {
    VERSION: pkg.version,
    CHARS: HREF.length.toLocaleString("en-US"),
    LINES: String(FILE.trim().split("\n").length),
    RED: String(FEATURES.filter((f) => f.group === "red").length),
    ALL: String(FEATURES.length),
  };
  const fill = (s) => s.replace(/\b(VERSION|CHARS|LINES|RED|ALL)\b/g, (w) => values[w]);

  const list = (items) => items.map((i) => "- " + fill(i)).join("\n");
  const page = (title, body) => "# " + title + "\n\n" + NOTE + "\n\n" + body.trim() + "\n";
  const feature = (f, n) =>
    "### " +
    String(n).padStart(2, "0") +
    " " +
    f.title +
    "\n\n" +
    (f.wcag ? "WCAG `" + f.wcag + "`\n\n" : "") +
    fill(f.short) +
    "\n\n" +
    fill(f.long) +
    "\n\n[See it](" +
    SITE +
    "#" +
    showId(f.title) +
    ")\n";

  const order = pageOrder(FEATURES);
  const num = (f) => order.indexOf(f) + 1;
  const lifted = [...STEP_READ.rows, ...STEP_AI.rows];
  const section = (title, items) => "## " + title + "\n\n" + items.map((f) => feature(f, num(f))).join("\n");
  const groupMd = (g) => section(g.title, FEATURES.filter((f) => f.group === g.id && !lifted.includes(f.title)));
  const stepMd = (st) => section(st.title, st.rows.map((t) => FEATURES.find((f) => f.title === t)));

  const red = GROUPS.filter((g) => g.id === "red");
  const rest = GROUPS.filter((g) => g.id !== "red");

  const apiMd = API.map((a) => "### `" + a.call + "`\n\n" + fill(a.gives) + "\n").join("\n");

  return {
    "checks.md": page("Checks", red.map(groupMd).join("\n")),
    "features.md": page("Features", [stepMd(STEP_READ), stepMd(STEP_AI), ...rest.map(groupMd)].join("\n")),
    "keys.md": page(
      "Keys",
      "## " +
        (KEYS.title || "Keys") +
        "\n\n" +
        list(KEYS.items) +
        "\n\n## How to read it\n\n" +
        list(READ.items) +
        "\n\n## " +
        (QUIET.title || "When it stays quiet") +
        "\n\n" +
        list(QUIET.items)
    ),
    "api.md": page("window.__tabTrail", apiMd),
    "limits.md": page("What it leaves to a full audit", list(LIMITS)),
    "compared.md": page("Next to the tools you know", list(VS)),
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = await buildDocs();
  const dir = join(root, "docs");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(out)) writeFileSync(join(dir, name), content);
  const readme = join(root, "README.md");
  if (existsSync(readme)) {
    const { text, missing } = fillReadme(readFileSync(readme, "utf8"), await readmeBlocks());
    if (missing.length) {
      console.error("README.md is missing the blocks: " + missing.join(", "));
      process.exit(1);
    }
    writeFileSync(readme, text);
  }
}
