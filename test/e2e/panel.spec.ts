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

test("regions() counts the stops in each region", async ({ page }) => {
  await open(page, "regions.html");
  expect(await page.evaluate(() => window.__tabTrail.regions())).toEqual({ header: 3, nav: 4, main: 4, aside: 1, footer: 3, other: 0 });
});

test("Region map follows page changes", async ({ page }) => {
  await open(page, "regions.html");
  await page.locator("#tab-trail-host button.sg", { hasText: "Settings" }).click();
  await page.locator("#tab-trail-host label", { hasText: "Region map" }).click();
  await page.evaluate(() => { const a = document.querySelector("footer a")!; document.querySelector("main")!.append(a); });
  await expect(page.locator("#tab-trail-host .bl")).toHaveText(/Main 5.*Footer 2/);
});

test("Region map shows only when its setting is on", async ({ page }) => {
  await open(page, "regions.html");
  const bar = page.locator("#tab-trail-host", { hasText: "stops, by region" });
  await expect(bar).toHaveCount(0);
  await page.locator("#tab-trail-host button.sg", { hasText: "Settings" }).click();
  await page.locator("#tab-trail-host label", { hasText: "Region map" }).click();
  await expect(bar).toHaveCount(1);
  await expect(page.locator("#tab-trail-host .bl")).toHaveText(/Header 3.*Nav 4.*Main 4.*Aside 1.*Footer 3/);
});
