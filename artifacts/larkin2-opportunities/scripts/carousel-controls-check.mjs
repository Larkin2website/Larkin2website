import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `${process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80"}/larkin2-opportunities`;
const titles = ["Paid Opportunities", "Opportunities are Open for All", "Every application matters", "Clear Timelines"];
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [320, 390, 430, 820, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/#commitments`);
    await page.getByRole("button", { name: "Dismiss cookie notice", exact: true }).click();
    const carousel = page.getByRole("region", { name: "Our commitments. Use the arrow keys or buttons to view each commitment.", exact: true });
    const previous = page.getByTestId("button-commitment-previous");
    const next = page.getByTestId("button-commitment-next");
    const status = carousel.getByRole("status");
    const checkSlide = async index => {
      await page.waitForFunction(index => document.querySelector(`.larkin2-carousel-slide[data-testid="item-commitment-0${index + 1}"]`)?.dataset.active === "true", index);
      assert.equal((await status.textContent()).trim(), `Commitment ${index + 1} of 4: ${titles[index]}`);
      assert.equal(await previous.isDisabled(), index === 0);
      assert.equal(await next.isDisabled(), index === 3);
      assert.equal(await page.getByTestId(`button-commitment-dot-${index + 1}`).getAttribute("aria-current"), "true");
      assert.equal(await carousel.evaluate(el => {
        const row = el.querySelector(".larkin2-carousel-controls");
        const buttons = [...row.querySelectorAll(".larkin2-carousel-btn")];
        const [left, right] = buttons.map(b => b.getBoundingClientRect());
        const middle = row.querySelector(".larkin2-carousel-pagination").getBoundingClientRect();
        const indicator = row.querySelector(".larkin2-carousel-indicator");
        const arrowCentered = buttons.every(b => {
          const text = [...b.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
          const range = document.createRange();
          const start = text.textContent.search(/\S/);
          range.setStart(text, start);
          range.setEnd(text, start + 1);
          const glyph = range.getBoundingClientRect(), button = b.getBoundingClientRect();
          return Math.abs((glyph.left + glyph.right) / 2 - (button.left + button.right) / 2) < 2
            && Math.abs((glyph.top + glyph.bottom) / 2 - (button.top + button.bottom) / 2) < 5;
        });
        return buttons.every(b => {
          const box = b.getBoundingClientRect();
          return box.width >= 48 && box.height >= 48 && Math.abs(box.width - box.height) < 1
            && getComputedStyle(b).borderRadius === "50%";
        }) && arrowCentered && left.right < middle.left && middle.right < right.left
          && row.getBoundingClientRect().left >= 0 && row.getBoundingClientRect().right <= innerWidth
          && row.scrollWidth <= row.clientWidth + 1
          && indicator.scrollWidth <= indicator.clientWidth + 1 && indicator.scrollHeight <= indicator.clientHeight + 1
          && [...row.querySelectorAll(".larkin2-carousel-dot")].every(b => {
            const box = b.getBoundingClientRect();
            return box.width >= 28 && box.height >= 44 && box.left >= middle.left && box.right <= middle.right;
          });
      }), true, `Uncrushed, centered controls and readable pagination at ${width}px, slide ${index + 1}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    };
    await checkSlide(0);
    for (let index = 1; index < 4; index++) {
      await next.click();
      await checkSlide(index);
    }
    for (let index = 2; index >= 0; index--) {
      await previous.click();
      await checkSlide(index);
    }
    for (let index = 0; index < 4; index++) {
      await page.getByTestId(`button-commitment-dot-${index + 1}`).click();
      await checkSlide(index);
    }
    await carousel.focus();
    await page.keyboard.press("ArrowRight");
    await checkSlide(3);
    for (let index = 2; index >= 0; index--) {
      await page.keyboard.press("ArrowLeft");
      await checkSlide(index);
    }
    await page.keyboard.press("ArrowLeft");
    await checkSlide(0);
    await page.keyboard.press("ArrowRight");
    await checkSlide(1);
    for (const button of [previous, next, page.getByTestId("button-commitment-dot-1")]) {
      await button.focus();
      assert.equal(await button.evaluate(el => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none"), true);
    }
    await next.focus();
    await page.keyboard.press("Enter");
    await checkSlide(2);
    await previous.focus();
    await page.keyboard.press("Space");
    await checkSlide(1);
    assert.deepEqual(errors, []);
    console.log(`${width}px: all four slides, 48px circular arrows, dots, full labels, pointer/keyboard navigation, focus and no overflow passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
