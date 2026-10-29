import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";
import { unreleased } from "./changelog.mjs";
import { buildDist } from "./build.mjs";
import { buildDocs, readmeBlocks, fillReadme } from "./docs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DASHES = /[\u2013\u2014]/;

const dashScanned = (path) =>
  path.startsWith("src/") ||
  path.startsWith("data/") ||
  path.startsWith("docs/") ||
  (/^[^/]+\.md$/.test(path)) ||
  /^\.github\/.*\.(md|ya?ml)$/.test(path);

function constOf(text, name) {
  const m = new RegExp("^export const " + name + " = (.*);$", "m").exec(text);
  return m ? JSON.parse(m[1]) : null;
}

function compare(label, actual, expected, failures) {
  for (const [name, content] of Object.entries(expected)) {
    if (!(label + name in actual)) failures.push(label + name + " is missing, run the build");
    else if (actual[label + name] !== content) failures.push(label + name + " is not what a fresh run makes");
  }
  for (const name of Object.keys(actual)) {
    if (!(name.slice(label.length) in expected)) failures.push(name + " is not made by a fresh run");
  }
}

export function runChecks(files, opts) {
  const failures = [];
  const get = (p) => files.get(p);

  for (const [path, text] of files) {
    if (dashScanned(path) && DASHES.test(text)) failures.push(path + " has an em dash or en dash");
  }

  const src = get("src/tab-trail.js");
  if (src !== undefined && src.includes("`")) failures.push("src/tab-trail.js has a backtick");

  const under = (p) =>
    Object.fromEntries([...files].filter(([k]) => k.startsWith(p)));
  compare("dist/", under("dist/"), opts.fresh.dist, failures);
  compare("docs/", under("docs/"), opts.fresh.docs, failures);

  if (opts.fresh.readme) {
    const readme = get("README.md");
    if (readme === undefined) failures.push("README.md is missing");
    else {
      const { text, missing } = fillReadme(readme, opts.fresh.readme);
      if (missing.length) failures.push("README.md is missing the blocks: " + missing.join(", "));
      else if (text !== readme) failures.push("README.md is not what a fresh docs run makes, run npm run docs");
    }
  }

  if (opts.srcChanged && !opts.labels.includes("no-changelog")) {
    if (unreleased(get("CHANGELOG.md") || "").length === 0) {
      failures.push("CHANGELOG.md has nothing under Unreleased, add a bullet or label the pull request no-changelog");
    }
  }

  const index = get("dist/index.mjs") || "";
  const href = constOf(index, "HREF");
  const budget = JSON.parse(get("package.json") || "{}").sizeBudget;
  if (href === null || typeof href !== "string") {
    failures.push("dist/index.mjs has no readable HREF");
  } else if (!Number.isFinite(budget) || budget <= 0) {
    failures.push("package.json has no valid sizeBudget");
  } else if (href.length > budget) {
    failures.push("package.json sizeBudget is " + budget + " but HREF is " + href.length + " characters");
  }

  const features = constOf(index, "FEATURES") || [];
  const docs = [...files].filter(([k]) => k.startsWith("docs/")).map(([, v]) => v).join("\n");
  for (const f of features) {
    const heading = new RegExp("^### (?:\\d+ )?" + f.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "m");
    if (!heading.test(docs)) failures.push("docs/ has no section for the feature " + f.title);
  }

  return failures;
}

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

export async function loadTree(opts) {
  const paths = [];
  for (const d of ["src", "data", "docs", "dist", ".github"]) walk(join(root, d), paths);
  for (const name of readdirSync(root)) {
    if (/\.md$/.test(name) || name === "package.json") paths.push(join(root, name));
  }
  const files = new Map();
  for (const p of paths) files.set(relative(root, p), readFileSync(p, "utf8"));
  const docs = await buildDocs();
  const readme = await readmeBlocks();
  return { files, opts: { ...opts, fresh: { dist: buildDist(), docs, readme } } };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const labels = JSON.parse(process.env.PR_LABELS || "[]");
  const srcChanged = process.env.SRC_CHANGED === "1";
  const { files, opts } = await loadTree({ srcChanged, labels });
  const failures = runChecks(files, opts);
  for (const f of failures) console.error("FAIL " + f);
  if (failures.length) process.exit(1);
  console.log("All checks passed");
}
