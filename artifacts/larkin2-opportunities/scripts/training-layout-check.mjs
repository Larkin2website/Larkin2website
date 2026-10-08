import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const base = `${process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80"}/larkin2-opportunities`;
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [1280, 1024, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/training`);
    await page.getByRole("heading", { name: "Departmental Budgeting", exact: true }).waitFor();
    assert.equal(await page.locator("main img, main .opp-card-media, main .opp-hero-media").count(), 0);
    assert.equal(await page.locator("[data-testid=training-unconfirmed] .programme-status-badge").count(), 0);
    assert.equal(await page.locator("main").getByText(/Registration status unconfirmed/i).count(), 0);
    assert.equal(await page.locator("main").getByText(/registration deadline for these courses cannot be confirmed/i).count(), 0);
    assert.equal(await page.locator(".training-overview-section h3").count(), 7);
    assert.equal(await page.locator(".training-overview-section .hetv-programme-item > a.larkin2-btn").count(), 7);
    assert.equal(await page.locator(".training-overview-section .hetv-programme-item > a").evaluateAll(links => links.every(link => {
      const style = getComputedStyle(link);
      return style.textDecorationLine === "none"
        && parseFloat(style.borderRadius) >= 100
        && link.getBoundingClientRect().height >= 46
        && style.backgroundColor !== "rgba(0, 0, 0, 0)";
    })), true);
    assert.equal(await page.locator(".training-course-group").first().getAttribute("data-testid"), "training-open");
    assert.equal(await page.locator("[data-testid=training-open]").getByRole("heading", { name: "First Credit Work Experience", exact: true }).count(), 0);
    assert.equal(await page.locator("[data-testid=training-closed]").getByRole("heading", { name: "First Credit Work Experience", exact: true }).count(), 1);
    assert.equal(await page.locator("[data-testid=training-closed] .hetv-programme-list").evaluate(el =>
      getComputedStyle(el).gridTemplateColumns.split(" ").length
    ), width >= 900 ? 2 : 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator(".hetv-programme-item").evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return box.width > 0 && box.left >= 0 && box.right <= innerWidth && card.scrollWidth <= card.clientWidth;
    })), true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, []);
    // Missing source dates must not hide the original provider form or invent an open status.
    await page.goto(`${base}/opportunities/departmental-budgeting`);
    await page.getByRole("heading", { name: "Departmental Budgeting", exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "View registration form" }).getAttribute("href"), "https://airtable.com/appBmuMR6u77V1PsU/pagxKsbTsGPSQJ24H/form");
    assert.deepEqual(errors, []);
    console.log(`${width}px: open courses first, First Credit in closed section, all six courses visible, responsive cards, accessibility and registration safety passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
