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

test("No focus style", async ({ page }) => {
  await open(page, "no-focus-style.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const probs = await page.evaluate(() => window.__tabTrail.problems());
  expect(await checks(page)).toEqual(["No focus style"]);
  expect(probs.map((p) => p.selector)).toEqual(["#bare"]);
  expect(probs[0].wcag).toBe("2.4.7 AA");
});

test("No focus style skips a stop under the mouse", async ({ page }) => {
  await open(page, "no-focus-style.html");
  const r = await page.locator("#hov").boundingBox();
  await page.mouse.move(r!.x + 5, r!.y + 5);
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const probs = await page.evaluate(() => window.__tabTrail.problems());
  expect(probs.map((p) => p.selector)).toEqual(["#bare"]);
});

test("Ghost stop", async ({ page }) => {
  await open(page, "ghost-stop.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const probs = await page.evaluate(() => window.__tabTrail.problems());
  expect(await checks(page)).toEqual(["Ghost stop"]);
  expect(probs).toHaveLength(5);
  const sels = probs.map((p) => p.selector);
  expect(sels).toContain("#hid");
  expect(sels).toContain("#clear");
  expect(sels.filter((s) => /strip|skip|late|slide|sw/.test(s))).toEqual([]);
  for (const p of probs) expect(p.wcag).toBe(p.selector === "#hid" ? "4.1.2 A" : "2.4.7 AA");
});

test("Ghost stop drops a stop that left the page", async ({ page }) => {
  await open(page, "ghost-stop.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  await page.evaluate(() => document.getElementById("off")!.remove());
  await expect(page.locator("#tab-trail-host button.c", { hasText: "off screen" })).toHaveCount(0);
  await expect(page.locator("#tab-trail-host button.c", { hasText: "Clear, invisible" })).toHaveCount(1);
});

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
