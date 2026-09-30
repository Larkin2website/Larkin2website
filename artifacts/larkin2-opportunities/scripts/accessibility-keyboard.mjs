import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const base = `${origin}/larkin2-opportunities`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium",
  args: ["--no-sandbox"],
});

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await desktop.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await desktop.waitForTimeout(1400);
  await desktop.keyboard.press("Tab");
  assert.match(await desktop.evaluate(() => document.activeElement?.textContent ?? ""), /skip to content/i);
  await desktop.keyboard.press("Enter");
  assert.equal(await desktop.evaluate(() => document.activeElement?.tagName), "MAIN");
  console.log("Desktop skip link places focus on the main landmark");

  const rolesLink = desktop.locator('nav[aria-label="Main navigation"] a[href$="/roles"]');
  await rolesLink.focus();
  await desktop.keyboard.press("Enter");
  await desktop.waitForURL(/\/roles$/);
  await desktop.getByRole("heading", { name: "Search Available roles here" }).waitFor();
  assert.equal(await desktop.evaluate(() => document.activeElement?.tagName), "H1");
  console.log("Client-side route change announces the new page heading through focus");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobile.goto(`${base}/roles`, { waitUntil: "domcontentloaded" });
  const opener = mobile.getByRole("button", { name: "Open navigation menu" });
  await opener.focus();
  await mobile.keyboard.press("Enter");
  const dialog = mobile.getByRole("dialog", { name: /navigation/i });
  await dialog.waitFor();
  await mobile.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Close menu");
  assert.equal(await mobile.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close menu");
  await mobile.keyboard.press("Shift+Tab");
  assert.match(await mobile.evaluate(() => document.activeElement?.textContent ?? ""), /read the faqs/i);
  await mobile.keyboard.press("Tab");
  assert.equal(await mobile.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close menu");
  await mobile.keyboard.press("Escape");
  assert.equal(await opener.evaluate(element => document.activeElement === element), true);
  console.log("Mobile menu traps keyboard focus and Escape restores the opener");

  const preferenceTree = await mobile.locator("main").ariaSnapshot();
  assert.match(preferenceTree, /Search Available roles here/);
  console.log("Accessible tree exposes the roles heading");
  assert.equal(await mobile.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
  console.log("Reduced-motion preference is active in the browser checks");
} finally {
  await browser.close();
}