import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of process.argv.includes("--compact-only") ? [320] : [1280, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:80/larkin2-opportunities/#faqs");
    const items = page.locator("#faqs details");
    await items.first().waitFor();
    assert.equal(await items.count(), 2);
    const first = items.nth(0);
    const second = items.nth(1);
    const question = first.locator("summary");
    for (const item of [first, second]) {
      assert.equal(await item.getAttribute("open"), null);
      assert.equal(await item.locator(".home-faq-answer").isVisible(), false);
    }
    await question.focus();
    assert.equal(await question.evaluate(el => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none"), true);
    await page.keyboard.press("Enter");
    assert.notEqual(await first.getAttribute("open"), null);
    assert.equal(await first.locator(".home-faq-answer").isVisible(), true);
    assert.equal(await first.locator("svg").evaluate(el => Math.round(new DOMMatrixReadOnly(getComputedStyle(el).transform).a)), -1);
    await page.keyboard.press("Space");
    assert.equal(await first.getAttribute("open"), null);
    await question.click();
    assert.equal(await first.locator(".home-faq-answer").isVisible(), true);
    await second.locator("summary").click();
    assert.equal(await second.locator(".home-faq-answer").isVisible(), true);
    assert.equal(await first.locator(".home-faq-answer").isVisible(), true);
    const email = second.getByRole("link", { name: "admin@HETVopportunities.com" });
    assert.equal(await email.getAttribute("href"), "mailto:admin@HETVopportunities.com");
    assert.equal(await second.locator("p").count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await items.evaluateAll(nodes => nodes.every(el => {
      const box = el.getBoundingClientRect();
      const question = el.querySelector("summary").getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && question.height >= 48 && el.scrollWidth <= el.clientWidth;
    })), true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document.querySelector("#faqs"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    })).violations.map(v => v.id)), []);
    assert.equal(await page.getByRole("link", { name: "View more FAQs", exact: true }).getAttribute("href"), "/larkin2-opportunities/faqs");
    assert.equal(await page.locator("#signup").count(), 1);
    assert.deepEqual(errors, []);
    console.log(`${width}px: collapsed defaults, click/Enter/Space toggles, independent answers, email and FAQ links, chevrons, accessibility and no overflow passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
