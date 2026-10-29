import { test, expect } from "@playwright/test";
import { open, press, checks } from "./load";

test("clean page has no problems after Play", async ({ page }) => {
  await open(page, "clean.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const state = await page.evaluate(() => window.__tabTrail.state());
  expect(state.total).toBeGreaterThan(0);
  expect(state.done).toBe(true);
  expect(state.walked).toBe(state.total);
  expect(await page.evaluate(() => window.__tabTrail.problems())).toEqual([]);
});

test("broken page has 3 missed spots and hover menus", async ({ page }) => {
  await open(page, "broken.html");
  const problems = await page.evaluate(() => window.__tabTrail.problems());
  expect(problems.filter((p) => p.check === "Missed spots" || p.check === "Hover menus")).toHaveLength(3);
});

for (const [file, check] of [
  ["missed-spots.html", "Missed spots"],
  ["hover-menus.html", "Hover menus"],
  ["forced-order.html", "Forced order"],
  ["hidden-focus.html", "Hidden focus"],
] as const) {
  test(check, async ({ page }) => {
    await open(page, file);
    await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
    expect(await checks(page)).toEqual([check]);
  });
}

test("Out of order", async ({ page }) => {
  await open(page, "out-of-order.html");
  await page.focus("#first");
  await press(page, "Tab");
  await expect(page.locator("#third")).toBeFocused();
  expect(await checks(page)).toEqual(["Out of order"]);
});

test("Keyboard trap", async ({ page }) => {
  await open(page, "keyboard-trap.html");
  await page.focus("#trap");
  await press(page, "Tab");
  await press(page, "Shift+Tab");
  await expect(page.locator("#trap")).toBeFocused();
  expect(await checks(page)).toEqual(["Keyboard trap"]);
});

test("Lost focus", async ({ page }) => {
  await open(page, "lost-focus.html");
  await page.focus("#open");
  await press(page, "Enter");
  await expect(page.locator("#close")).toBeFocused();
  await press(page, "Enter");
  await expect(page.locator("#note")).toBeHidden();
  await expect.poll(() => checks(page)).toEqual(["Lost focus"]);
});
