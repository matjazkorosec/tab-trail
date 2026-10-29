import { test, expect } from "@playwright/test";
import { open } from "./load";

test("report keeps tabindex and says where the element is", async ({ page }) => {
  await open(page, "forced-order.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const report = await page.evaluate(() => window.__tabTrail.report());
  expect(report).toContain('tabindex="1"');
  expect(report).toContain('Where: under the heading "Forced order"');
});

test("hover menu with nothing focusable asks for a toggle button", async ({ page }) => {
  await open(page, "hover-menus.html");
  const report = await page.evaluate(() => window.__tabTrail.report());
  expect(report).toContain("Nothing inside it can take keyboard focus now");
  expect(report).not.toContain('tabindex="-1", so Tab skips them');
});
