import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export const script = readFileSync(new URL("../../dist/tab-trail.js", import.meta.url), "utf8");

export async function open(page: Page, file: string) {
  await page.goto(file);
  await page.evaluate(script);
  await page.waitForFunction(() => !!window.__tabTrail);
}

export async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(400);
}

export async function checks(page: Page) {
  const problems = await page.evaluate(() => window.__tabTrail.problems());
  return [...new Set(problems.map((p) => p.check))];
}
