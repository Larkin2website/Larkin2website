import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `${process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80"}/larkin2-opportunities`;
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [1280, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/opportunities`);
    await page.getByRole("heading", { name: "Departmental Budgeting", exact: true }).waitFor();
    const main = page.locator("main");
    assert.equal(await main.getByText(/unconfirmed|cannot confirm|programme has been delivered|example/i).count(), 0);
    assert.equal(await page.locator("[data-testid=section-unconfirmed]").getByRole("heading", { name: "More opportunities" }).count(), 1);
    assert.equal(await page.getByTestId("link-opp-departmental-budgeting").count(), 1);
    assert.equal(await page.getByTestId("link-opp-career-mapping-session").count(), 1);
    assert.equal(await page.locator("#previous-programmes").getByTestId("link-opp-first-credit").count(), 1);
    assert.equal(await page.locator('a[href*="sample-round-2-programme"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${base}/development`);
    await page.locator('main a[href$="/opportunities/director-pathway"]').waitFor();
    assert.equal(await page.locator("main").getByText(/programme has been delivered/i).count(), 0);
    await page.goto(`${base}/opportunities/departmental-budgeting`);
    await page.getByRole("heading", { name: "Departmental Budgeting", exact: true }).waitFor();
    assert.equal(await page.getByTestId("link-opp-apply").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`${width}px: real listings retained, notices and example removed, unverified Apply remains disabled`);
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto(`${base}/opportunities/sample-round-2-programme`);
  await page.getByRole("heading", { name: "Page not found", exact: true }).waitFor();
  assert.equal(await page.getByText(/Example HETV development programme/i).count(), 0);
  console.log("Former example programme route now displays Not Found");
} finally {
  await browser.close();
}
