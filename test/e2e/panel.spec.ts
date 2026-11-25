import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { open, press } from "./load";

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

test("cost() lists the goals and their Tab presses", async ({ page }) => {
  await open(page, "tab-cost.html");
  const goals = await page.evaluate(() => window.__tabTrail.cost());
  expect(goals.map((g) => [g.name, g.presses, g.how])).toEqual([
    ["Newsletter", 13, "set in the page"],
    ["the main content", 9, "always"],
    ["Add to cart", 10, "found by its words"],
  ]);
  expect(await page.evaluate(() => window.__tabTrail.cost("button"))).toBe(10);
});

test("Tab cost shows only when its setting is on, and a goal can be picked", async ({ page }) => {
  await open(page, "tab-cost.html");
  const block = page.locator("#tab-trail-host", { hasText: "Tab presses to reach" });
  await expect(block).toHaveCount(0);
  await page.locator("#tab-trail-host button.sg", { hasText: "Settings" }).click();
  await page.locator("#tab-trail-host label", { hasText: "Tab cost" }).click();
  await expect(block).toHaveCount(1);
  const url = page.url();
  await page.locator("#tab-trail-host button", { hasText: "Pick a goal" }).click();
  await page.click("text=Menu 3");
  expect(page.url()).toBe(url);
  const goals = await page.evaluate(() => window.__tabTrail.cost());
  expect([goals[0].name, goals[0].presses, goals[0].how]).toEqual(["Menu 3", 3, "picked by you"]);
});

test.describe("Tab cost pick mode", () => {
  async function pick(page) {
    await open(page, "tab-cost.html");
    await page.locator("#tab-trail-host button.sg", { hasText: "Settings" }).click();
    await page.locator("#tab-trail-host label", { hasText: "Tab cost" }).click();
    await page.locator("#tab-trail-host button", { hasText: "Pick a goal" }).click();
  }

  test("closing Tab trail while picking gives clicks back", async ({ page }) => {
    await pick(page);
    await page.evaluate(() => window.__tabTrail.close());
    await page.click("text=Menu 3");
    expect(page.url()).toMatch(/#h3$/);
  });

  test("Enter on a page link does nothing while picking", async ({ page }) => {
    await pick(page);
    const url = page.url();
    await page.focus("text=Menu 2");
    await page.keyboard.press("Enter");
    expect(page.url()).toBe(url);
  });

  test("the pick click does not pause Play", async ({ page }) => {
    await pick(page);
    await page.evaluate(() => { window.__tabTrail.play({ delay: 300 }); });
    await page.click("text=Menu 3");
    const lines = await page.evaluate(() => window.__tabTrail.log());
    expect(lines.some((l) => l.text.includes("Paused by a click"))).toBe(false);
  });

  test("Pick a goal keeps keyboard focus on the panel", async ({ page }) => {
    await pick(page);
    const name = await page.evaluate(() => (document.getElementById("tab-trail-host")!.shadowRoot!.activeElement || {}).textContent);
    expect(name).toBe("Cancel");
  });
});

test("Tab cost always lists the main content, and follows page changes", async ({ page }) => {
  await open(page, "tab-cost.html");
  await page.evaluate(() => document.querySelectorAll("nav a").forEach((a, i) => i < 3 && a.setAttribute("data-tab-trail-goal", "Goal " + i)));
  const names = (await page.evaluate(() => window.__tabTrail.cost())).map((g) => g.name);
  expect(names).toHaveLength(3);
  expect(names).toContain("the main content");
  await page.locator("#tab-trail-host button.sg", { hasText: "Settings" }).click();
  await page.locator("#tab-trail-host label", { hasText: "Tab cost" }).click();
  await page.evaluate(() => document.querySelectorAll("nav a").forEach((a) => a.removeAttribute("data-tab-trail-goal")));
  await page.evaluate(() => { document.querySelector("main button")!.textContent = "Our offers"; });
  await expect(page.locator("#tab-trail-host", { hasText: "Add to cart" })).toHaveCount(0);
});

test("Check all bookmark checks every stop on open and puts the page back", async ({ page }) => {
  const { HREF_ALL } = await import("../../dist/index.mjs");
  await page.goto("check-all.html");
  await page.evaluate(decodeURIComponent(HREF_ALL.slice("javascript:".length)));
  await page.waitForFunction(() => !!window.__tabTrail && window.__tabTrail.state().done, null, { timeout: 30000 });
  const problems = await page.evaluate(() => window.__tabTrail.problems());
  expect(problems.filter((p) => p.check === "No focus style").map((p) => p.selector)).toContain("#bare");
  expect(problems.map((p) => p.check)).toContain("Ghost stop");
  expect(problems.filter((p) => p.check === "No focus style").map((p) => p.selector)).not.toContain("#ok");
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("play({ quiet: true }) puts focus and scroll back", async ({ page }) => {
  await open(page, "check-all.html");
  await page.evaluate(() => { document.getElementById("ok").focus(); scrollTo({ top: 40, behavior: "instant" }); });
  const y = await page.evaluate(() => scrollY);
  await page.evaluate(() => window.__tabTrail.play({ delay: 0, quiet: true }));
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("ok");
  expect(await page.evaluate(() => scrollY)).toBe(y);
  expect(await page.evaluate(() => window.__tabTrail.state().done)).toBe(true);
});

test("panel lists problems by WCAG level, AA first, and closes A when there are many", async ({ page }) => {
  await open(page, "many-problems.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  const host = page.locator("#tab-trail-host");
  await expect(host.locator(".lvh")).toHaveText([/^Level AA/, /^Level A /]);
  await expect(host.locator(".gh", { hasText: "No focus style" })).toHaveAttribute("aria-expanded", "true");
  await expect(host.locator(".gh", { hasText: "Nameless stop" })).toHaveAttribute("aria-expanded", "false");
  await expect(host.locator(".pbx")).not.toHaveClass(/scr/);
  await host.locator(".gh", { hasText: "Nameless stop" }).click();
  await expect(host.locator(".gh", { hasText: "Nameless stop" })).toHaveAttribute("aria-expanded", "true");
  await expect(host.locator("button.c", { hasText: "Button" })).toBeVisible();
});

test("panel scrolls the problems when more than 8 checks fail", async ({ page }) => {
  await open(page, "many-problems.html");
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  await page.focus("#first");
  await press(page, "Tab");
  await page.focus("#trap");
  await press(page, "Tab");
  await press(page, "Shift+Tab");
  await expect(page.locator("#tab-trail-host .gh")).toHaveCount(9);
  await expect(page.locator("#tab-trail-host .pbx")).toHaveClass(/scr/);
});

test("problem tile and checks bar sum up the run", async ({ page }) => {
  await open(page, "no-focus-style.html");
  const host = page.locator("#tab-trail-host");
  await expect(host.locator(".ck")).toBeHidden();
  await page.evaluate(() => window.__tabTrail.play({ delay: 50 }));
  await expect(host.locator(".ti").first()).toHaveText("1problem");
  await expect(host.locator(".ckt")).toHaveText("7 passed · 1 failed · 4 not tested");
  await expect(host.locator(".sm")).toBeHidden();
  await host.locator(".ckh").click();
  await expect(host.locator(".sm")).toContainText("12 checks: 7 passed, 1 found a problem, 4 not tested.");
});

test("? button shows Legend and Shortcuts, and Escape closes only the card", async ({ page }) => {
  await open(page, "clean.html");
  const host = page.locator("#tab-trail-host");
  await expect(host.locator("button.sg", { hasText: /Legend|Shortcuts/ })).toHaveCount(0);
  await expect(host.locator(".hp")).toBeHidden();
  await host.locator("button.qm").click();
  await expect(host.locator(".hp")).toContainText("The order Tab visits");
  await expect(host.locator(".hp")).toContainText("into this panel");
  await page.keyboard.press("Escape");
  await expect(host.locator(".hp")).toBeHidden();
  await expect(host).toHaveCount(1);
});
