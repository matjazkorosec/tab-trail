import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { open } from "./load";

const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

test("panel links back to the page", async ({ page }) => {
  await open(page, "clean.html");
  await expect(page.locator("#tab-trail-host a[href='https://matjazkorosec.com/tools/tab-trail']")).toHaveCount(1);
});

test("report points at the pinned copy on the site", async ({ page }) => {
  await open(page, "clean.html");
  expect(await page.evaluate(() => window.__tabTrail.version)).toBe(version);
  const report = await page.evaluate(() => window.__tabTrail.report());
  expect(report).toContain("raw.githubusercontent.com/matjazkorosec/tab-trail/v" + version + "/dist/tab-trail.js");
});

test("close removes the panel and the API", async ({ page }) => {
  await open(page, "clean.html");
  await page.evaluate(() => window.__tabTrail.close());
  await expect(page.locator("#tab-trail-host")).toHaveCount(0);
  expect(await page.evaluate(() => "__tabTrail" in window)).toBe(false);
});
