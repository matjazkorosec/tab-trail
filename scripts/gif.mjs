import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = process.argv[2] || "https://matjazkorosec.com/tools/tab-trail";
const OUT = join(root, ".github/assets/trail.gif");
const LIMIT = 3 * 1024 * 1024;
const W = 1440;
const H = 720;

if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("ffmpeg is not installed. Install it and run this again:");
  console.error("  Mac:     brew install ffmpeg");
  console.error("  Linux:   sudo apt install ffmpeg");
  console.error("  Windows: winget install ffmpeg");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "tab-trail-gif-"));
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir, size: { width: W, height: H } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(PAGE, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "nextjs-portal{display:none!important}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}",
  });
  const start = (Date.now() - t0) / 1000;
  await page.waitForTimeout(3000);
  await page.evaluate(readFileSync(join(root, "dist/tab-trail.js"), "utf8"));
  await page.waitForFunction(() => !!window.__tabTrail);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2500);
  const length = (Date.now() - t0) / 1000 - start;
  await page.close();
  const video = await page.video().path();
  await context.close();

  mkdirSync(dirname(OUT), { recursive: true });
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(start),
      "-t",
      String(length),
      "-i",
      video,
      "-vf",
      "fps=12,scale=1280:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
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
  rmSync(dir, { recursive: true, force: true });
}
