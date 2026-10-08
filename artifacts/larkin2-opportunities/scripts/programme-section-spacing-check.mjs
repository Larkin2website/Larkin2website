import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `${process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80"}/larkin2-opportunities`;
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [1280, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const [route, readyLink] of [
      ["opportunities", "departmental-budgeting"],
      ["training", "departmental-budgeting"],
      ["development", "director-pathway"],
    ]) {
      await page.goto(`${base}/${route}`);
      await page.locator(`main a[href$="/opportunities/${readyLink}"]`).waitFor();
      const gaps = await page.locator("main .opp-list, main .hetv-programme-list").evaluateAll(lists =>
        lists.map(list => {
          const intro = list.previousElementSibling;
          const card = list.querySelector(".opp-card, .hetv-programme-item");
          if (!intro || !card || !["H2", "P"].includes(intro.tagName)) return null;
          return {
            intro: intro.textContent.trim(),
            gap: card.getBoundingClientRect().top - intro.getBoundingClientRect().bottom,
          };
        }).filter(Boolean)
      );
      assert.ok(gaps.length >= (route === "development" ? 1 : 3), `${route}: listing sections must be present`);
      for (const { intro, gap } of gaps) {
        assert.ok(gap >= 31.5 && gap <= 57, `${width}px ${route}: ${intro}: unexpected gap ${gap}px`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`${width}px /${route}: consistent spacing before all ${gaps.length} listing groups`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
