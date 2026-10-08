import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const base = `${process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80"}/larkin2-opportunities`;
const approved = JSON.parse(readFileSync(new URL("../../../scripts/data/training-courses.json", import.meta.url)));
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of process.argv.includes("--destinations-only") ? [] : [1280, 1024, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = [];
    const events = [];
    page.on("pageerror", error => errors.push(error.message));
    // Verify tracking without adding test engagements to the database.
    await page.route("**/api/public/engagement", async route => {
      events.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto(`${base}/opportunities/career-mapping-session`);
    const apply = page.getByRole("link", { name: "Register for this course", exact: true });
    await apply.waitFor();
    const updates = page.getByRole("link", { name: "Future opportunity updates", exact: true });
    const expected = approved.find(course => course.slug === "career-mapping-session").applicationUrl;
    assert.equal(await apply.getAttribute("href"), expected);
    assert.equal(await updates.getAttribute("href"), "/larkin2-opportunities/#signup");
    assert.equal(await page.getByRole("link", { name: "Register interest", exact: true }).count(), 0);
    const geometry = await page.locator(".opp-status-actions").evaluate(group => {
      const links = [...group.querySelectorAll("a")];
      const boxes = links.map(link => link.getBoundingClientRect());
      return {
        gap: boxes[1].top - boxes[0].bottom,
        widths: boxes.map(box => box.width),
        valid: links.every(link => {
          const box = link.getBoundingClientRect();
          const label = link.querySelector(".larkin2-link-label");
          const text = label.firstElementChild.getBoundingClientRect();
          const mask = label.getBoundingClientRect();
          return box.height >= 46 && box.left >= 0 && box.right <= innerWidth
            && link.scrollWidth <= link.clientWidth && text.width <= mask.width + 1 && text.height <= mask.height + 1
            && parseFloat(getComputedStyle(link).borderRadius) >= 100;
        }),
      };
    });
    assert.equal(geometry.gap, 12);
    assert.ok(Math.abs(geometry.widths[0] - geometry.widths[1]) < 1);
    assert.equal(geometry.valid, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await apply.focus();
    assert.equal(await apply.evaluate(el => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none"), true);
    await page.keyboard.press("Tab");
    assert.equal(await updates.evaluate(el => el === document.activeElement), true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, []);
    // Intercept the destination: no external form is filled or submitted.
    await page.route("https://airtable.com/**", route => route.fulfill({
      status: 200, contentType: "text/html", body: "<h1>Verified registration destination</h1>",
    }));
    await apply.click();
    await page.getByRole("heading", { name: "Verified registration destination" }).waitFor();
    assert.equal(page.url(), expected);
    assert.ok(events.some(event => event.kind === "programme" && event.event === "apply"));
    for (const slug of ["departmental-budgeting", "conflict-resolution-training", "first-credit"]) {
      await page.goto(`${base}/opportunities/${slug}`);
      await page.getByTestId("link-opp-signup").waitFor();
      assert.equal(await page.getByTestId("link-opp-apply").count(), 0);
      if (slug !== "first-credit") assert.equal(await page.getByRole("link", { name: "Future opportunity updates", exact: true }).count(), 1);
    }
    assert.deepEqual(errors, []);
    console.log(`${width}px: direct form navigation, separated equal-width buttons, unclipped labels, keyboard focus, accessibility, tracking and closed/unconfirmed gating passed`);
    await page.close();
  }
  const page = await browser.newPage();
  const responsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith("/api/public/programmes") && response.request().method() === "GET",
  );
  await page.goto(`${base}/opportunities`);
  const response = await responsePromise;
  assert.ok(response.ok());
  const programmes = await response.json();
  const enabled = programmes.filter(programme => programme.category === "training" && programme.applicationUrl);
  assert.ok(enabled.length > 0);
  for (const programme of enabled) {
    assert.equal(programme.applicationUrl, approved.find(course => course.slug === programme.slug)?.applicationUrl);
    assert.ok(programme.applicationUrl.startsWith("https://airtable.com/"));
  }
  console.log(`All ${enabled.length} currently enabled course destinations match the approved direct forms; no course records changed`);
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.route("**/api/public/engagement", route => route.fulfill({
    status: 200, contentType: "application/json", body: "{}",
  }));
  await page.goto(`${base}/opportunities/career-mapping-session`);
  const apply = page.getByTestId("link-opp-apply");
  await apply.hover();
  await page.waitForTimeout(450);
  assert.equal(await apply.evaluate(link => {
    const clone = link.querySelector(".larkin2-link-label > span:last-child");
    return Math.abs(new DOMMatrixReadOnly(getComputedStyle(clone).transform).m42) < 1;
  }), true);
  await page.getByRole("link", { name: "Future opportunity updates", exact: true }).click();
  await page.waitForURL(`${base}/#signup`);
  await page.locator("#signup").waitFor({ state: "visible" });
  assert.equal(await page.getByTestId("link-opp-apply").count(), 0);
  console.log("Mobile hover animation and secondary navigation to the real hub signup passed; no signup submitted");
} finally {
  await browser.close();
}
