import assert from "node:assert/strict";
import { chromium } from "playwright";

// The editor is exercised with a mocked session and in-memory API.
// No application records are created or changed by this check.
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const base = `${origin}/larkin2-opportunities-portal`;
const id = "00000000-0000-4000-8000-000000000215";
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [1280, 1024, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let record = {
      id, slug: "editor-check", num: "01", title: "Editor check programme", cardTitle: "Editor check",
      cardCopy: "Editor check description", cardCta: "View programme", image: "first-credit-camera.webp",
      shortDescription: "Editor check introduction", applicationStatus: "Closed", location: "London",
      status: "closed", featured: false, displayOrder: 0, deadline: null, applicationDeadline: null,
      applicationUrl: null, createdAt: "2026-10-08T00:00:00Z", updatedAt: "2026-10-08T00:00:00Z",
      category: "training", registrationState: "unconfirmed", registrationClosesOn: "2026-10-13",
      sections: [{ section: "training", position: 0, content: "Introduction\n\nFirst\nSecond\n\nConclusion" }],
    };
    let saved = false;
    await page.route("**/api/portal/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/session")) {
        await route.fulfill({ json: { member: { id, displayName: "Browser check", email: "check@example.invalid", role: "admin", active: true }, permissions: ["programmes:read", "programmes:write"] } });
      } else if (path.endsWith("/programmes") && route.request().method() === "POST") {
        record = { ...record, ...route.request().postDataJSON(), status: "draft" };
        saved = true;
        await route.fulfill({ status: 201, json: record });
      } else if (path.endsWith(`/programmes/${id}`)) {
        if (route.request().method() === "PATCH") {
          record = { ...record, ...route.request().postDataJSON() };
          saved = true;
        }
        await route.fulfill({ json: record });
      } else if (path.endsWith("/matching")) {
        await route.fulfill({ json: { contentType: "programme", careerLevels: [], crafts: [], tags: [] } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto(`${base}/opportunities/${id}/edit`);
    assert.equal(await page.getByLabel("Registration deadline date (no timezone)").inputValue(), "2026-10-13");
    assert.match(await page.getByLabel("Listing category").innerText(), /Training course/);
    assert.match(await page.getByLabel("Verified registration status").innerText(), /Unconfirmed/);
    await page.getByRole("tab", { name: "Page Content", exact: true }).click();
    const textarea = page.locator('textarea[name="sections.0.content"]');
    await textarea.focus();
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.getByRole("button", { name: "Toggle bullet list", exact: true }).click();
    assert.equal(await textarea.inputValue(), "Introduction\n\n• First\n• Second\n\nConclusion");
    await page.getByText("Public preview", { exact: true }).click();
    assert.equal(await page.locator("details li").count(), 2);
    await page.getByRole("button", { name: "Add Section", exact: true }).click();
    await page.locator('textarea[name="sections.1.content"]').fill("New paragraph\n\n- New first\n- New second");
    await page.getByRole("button", { name: "Save Opportunity", exact: true }).click();
    await page.waitForURL(`${base}/opportunities/${id}`);
    assert(saved);
    assert.equal(record.image, "first-credit-camera.webp", "Editing preserves historical media values");
    assert.equal(record.category, "training");
    assert.equal(record.registrationState, "unconfirmed");
    assert.equal(record.registrationClosesOn, "2026-10-13");
    assert.equal(record.sections[0].content, "Introduction\n\n• First\n• Second\n\nConclusion");
    assert.equal(record.sections[1].content, "New paragraph\n\n- New first\n- New second");
    await page.goto(`${base}/opportunities/${id}/edit`);
    assert.equal(await page.getByLabel("Registration deadline date (no timezone)").inputValue(), "2026-10-13");
    await page.getByRole("tab", { name: "Page Content", exact: true }).click();
    assert.equal(await page.locator('textarea[name="sections.0.content"]').inputValue(), record.sections[0].content);
    assert.equal(await page.locator('textarea[name="sections.1.content"]').inputValue(), record.sections[1].content);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole("tab", { name: "Card Display", exact: true }).click();
    assert.equal(await page.getByLabel("Card Image", { exact: true }).count(), 0);
    assert.equal(await page.locator('input[name="image"]').count(), 0);
    for (const category of ["Programme", "Training course"]) {
      saved = false;
      await page.goto(`${base}/opportunities/new`);
      await page.getByLabel("Full Page Title", { exact: true }).fill(`Imageless ${category}`);
      await page.getByLabel("URL Slug", { exact: true }).fill(category === "Programme" ? "imageless-programme" : "imageless-training");
      await page.getByLabel("Display Number", { exact: true }).fill("10");
      await page.getByLabel("Location", { exact: true }).fill("Online");
      await page.getByLabel("Hero Introduction", { exact: true }).fill("A text-only opportunity.");
      await page.getByLabel("Listing category", { exact: true }).click();
      await page.getByRole("option", { name: category, exact: true }).click();
      await page.getByRole("tab", { name: "Card Display", exact: true }).click();
      await page.getByLabel("Card Title", { exact: true }).fill(`Imageless ${category}`);
      await page.getByLabel("Card Summary Copy", { exact: true }).fill("A course or programme without imagery.");
      assert.equal(await page.getByLabel("Card Image", { exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole("button", { name: "Save Opportunity", exact: true }).click();
      await page.waitForURL(`${base}/opportunities/${id}`);
      assert(saved, `${category}: new record submitted without an image field`);
      assert.equal(record.image, "");
      await page.goto(`${base}/opportunities/${id}/edit`);
      await page.getByRole("tab", { name: "Card Display", exact: true }).click();
      await page.getByRole("button", { name: "Save Opportunity", exact: true }).click();
      await page.waitForURL(`${base}/opportunities/${id}`);
      assert.equal(record.image, "");
    }
    console.log(`${width}px editor: format, preview, add section, save payload and reopen passed (mocked session/API)`);
    await page.close();
  }
} finally {
  await browser.close();
}
