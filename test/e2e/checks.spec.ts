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

for (const [name, file, text] of [
  ["Broken skip link", "skip-link.html", "#main is missing"],
  ["No skip link", "no-skip-link.html", "16 stops before the main content"],
] as const) {
  test(name, async ({ page }) => {
    await open(page, file);
    await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
    expect(await checks(page)).toEqual(["Broken skip link"]);
    expect(await page.evaluate(() => window.__tabTrail.problems())).toHaveLength(1);
    const lines = await page.evaluate(() => window.__tabTrail.log());
    expect(lines.some((l) => l.result === "PROBLEM" && l.text.includes(text))).toBe(true);
  });
}

test("No skip link stays red after a scroll", async ({ page }) => {
  await open(page, "no-skip-link.html");
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.evaluate(() => document.querySelector("main")!.append(Object.assign(document.createElement("a"), { href: "#x", textContent: "New" })));
  await page.waitForTimeout(1500);
  expect(await checks(page)).toEqual(["Broken skip link"]);
  const lines = await page.evaluate(() => window.__tabTrail.log());
  expect(lines.filter((l) => l.check === "Broken skip link" && l.result !== "INFO").map((l) => l.text)).toEqual(["16 stops before the main content, and no skip link."]);
});

test("Footer stops are not before the main content", async ({ page }) => {
  await open(page, "main-text.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  expect(await page.evaluate(() => window.__tabTrail.problems())).toEqual([]);
});

test("Header links are not skip links", async ({ page }) => {
  await open(page, "header-links.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  expect(await page.evaluate(() => window.__tabTrail.problems())).toEqual([]);
});

for (const [file, want, ok] of [
  ["no-way-out.html", ["No way out"], 0],
  ["way-out.html", [], 1],
  ["way-out.html#icon", [], 1],
  ["way-out.html#class", ["Nameless stop"], 1],
  ["way-out.html#svglabel", [], 1],
  ["native-dialog.html", [], 0],
] as const) {
  test("No way out: " + file, async ({ page, browserName }) => {
    await open(page, file);
    await page.focus("#pop input");
    for (let i = 0; i < 9; i++) await press(page, browserName === "webkit" ? "Alt+Tab" : "Tab");
    expect(await checks(page)).toEqual(want);
    const lines = await page.evaluate(() => window.__tabTrail.log());
    expect(lines.filter((l) => l.check === "No way out" && l.result === "OK")).toHaveLength(ok);
    if (file === "native-dialog.html") expect(lines.some((l) => l.check === "No way out" && l.result === "INFO" && l.text.includes("Native dialog"))).toBe(true);
  });
}

test("No way out: a non-modal dialog is not called native", async ({ page }) => {
  await open(page, "native-dialog.html#open");
  await page.focus("#pop input");
  const lines = await page.evaluate(() => window.__tabTrail.log());
  expect(lines.some((l) => l.text.includes("Native dialog"))).toBe(false);
});

test("No way out clears when a Close button is added", async ({ page, browserName }) => {
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await open(page, "no-way-out.html");
  await page.focus("#pop input");
  for (let i = 0; i < 3; i++) await press(page, tab);
  expect(await checks(page)).toEqual(["No way out"]);
  await page.evaluate(() => document.getElementById("pop")!.append(Object.assign(document.createElement("button"), { type: "button", textContent: "Close" })));
  for (let i = 0; i < 5; i++) await press(page, tab);
  expect(await checks(page)).toEqual([]);
});

test("Play alone does not pass No way out", async ({ page }) => {
  await open(page, "way-out.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  expect((await page.evaluate(() => window.__tabTrail.state())).untested).toContain("No way out");
});

test("Nameless stop", async ({ page }) => {
  await open(page, "nameless-stop.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  expect(await checks(page)).toEqual(["Nameless stop"]);
  const probs = await page.evaluate(() => window.__tabTrail.problems());
  expect(probs.map((p) => p.selector)).toEqual(["#ic1", "#ic2", "#img"]);
  const lines = await page.evaluate(() => window.__tabTrail.log());
  expect(lines.filter((l) => l.result === "INFO" && l.text.includes("3 links share the name Read more"))).toHaveLength(1);
});

test("Nameless stop clears when the stop gets a name", async ({ page, browserName }) => {
  await open(page, "nameless-stop.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  await page.evaluate(() => document.getElementById("ic2")!.setAttribute("aria-label", "Cart"));
  await page.focus("#ic1");
  await press(page, browserName === "webkit" ? "Alt+Tab" : "Tab");
  const probs = await page.evaluate(() => window.__tabTrail.problems());
  expect(probs.map((p) => p.selector)).toEqual(["#ic1", "#img"]);
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
