import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = "http://127.0.0.1:4310/" + (process.argv[2] || "demo.html");
const OUT = join(root, ".github/assets/trail.gif");
const LIMIT = 3 * 1024 * 1024;

if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("ffmpeg is not installed. Install it and run this again:");
  console.error("  Mac:     brew install ffmpeg");
  console.error("  Linux:   sudo apt install ffmpeg");
  console.error("  Windows: winget install ffmpeg");
  process.exit(1);
}

const up = async () => {
  try {
    return (await fetch(PAGE)).ok;
  } catch {
    return false;
  }
};

let server = null;
if (!(await up())) {
  server = spawn(process.execPath, [join(root, "test/serve.mjs")], { stdio: "ignore" });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
}

const frames = mkdtempSync(join(tmpdir(), "tab-trail-gif-"));
const list = [];
let n = 0;
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const shot = async (seconds) => {
    const name = String(n++).padStart(3, "0") + ".png";
    await page.screenshot({ path: join(frames, name) });
    list.push("file '" + name + "'", "duration " + seconds);
  };

  await page.goto(PAGE);
  await shot(1);
  await page.evaluate(readFileSync(join(root, "dist/tab-trail.js"), "utf8"));
  await page.waitForFunction(() => !!window.__tabTrail);
  await page.waitForTimeout(1200);
  await shot(2);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    await shot(0.9);
  }
  await shot(2.5);
  list.push("file '" + String(n - 1).padStart(3, "0") + ".png'");
  writeFileSync(join(frames, "list.txt"), list.join("\n") + "\n");

  mkdirSync(dirname(OUT), { recursive: true });
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      join(frames, "list.txt"),
      "-vf",
      "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none",
      "-loop",
      "0",
      OUT,
    ],
    { stdio: "inherit" }
  );
  if (ff.status !== 0) throw new Error("ffmpeg failed");

  const size = statSync(OUT).size;
  console.log("Saved " + OUT + " (" + (size / 1024 / 1024).toFixed(2) + " MB)");
  if (size > LIMIT) {
    console.error("The GIF is over 3 MB");
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  if (server) server.kill();
  rmSync(frames, { recursive: true, force: true });
}
