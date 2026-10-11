import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const base = `${origin}/larkin2-opportunities`;
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const [width, height] of [[1280, 900], [1440, 900], [820, 1180], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: "Dismiss cookie notice", exact: true }).click();
    await page.locator("#paths").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const core = await page.locator("#paths").evaluate((section) => ({
      height: section.getBoundingClientRect().height,
      cards: [...section.querySelectorAll(".larkin2-path")].map((card) => ({
        height: card.getBoundingClientRect().height,
        width: card.getBoundingClientRect().width,
        copy: card.querySelector("p")?.textContent,
        fontSize: parseFloat(getComputedStyle(card.querySelector("p")).fontSize),
        overflow: card.scrollHeight > card.clientHeight + 1,
      })),
    }));
    if (width >= 1280) assert(core.height <= height - 90, `Core section too tall at ${width}: ${core.height}`);
    assert.equal(core.cards.length, 3);
    assert(core.cards.every((card) => card.fontSize >= 15 && !card.overflow && card.copy.length > 80));
    await page.locator("#commitments").scrollIntoViewIfNeeded();
    const carousel = page.getByRole("region", { name: "Our commitments. Use the arrow keys or buttons to view each commitment.", exact: true });
    await carousel.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    assert.match(await page.locator('[aria-live="polite"]').allTextContents().then((text) => text.join(" ")), /Every application matters/);
    const commitmentHeight = await page.locator("#commitments").evaluate((node) => node.getBoundingClientRect().height);
    assert(commitmentHeight < height, `Commitment section too tall at ${width}: ${commitmentHeight}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${base}/development`);
    await page.locator("#previous-programmes a[data-testid=link-opp-director-pathway]").waitFor();
    assert.equal(await page.locator("#previous-programmes .programme-status-badge").count(), 2);
    for (const slug of ["director-pathway", "producer-pathway"]) {
      await page.goto(`${base}/opportunities/${slug}`);
      await page.getByRole("heading", { name: "How to Apply" }).waitFor();
      const content = await page.locator(".opp-main").innerText();
      assert(!/individual feedback/i.test(content));
      assert.match(content, /Wednesday 5th August/);
    }
    for (const route of ["/roles", "/training"]) {
      await page.goto(`${base}${route}`);
      assert.equal(await page.locator('a[href$="/development#previous-programmes"]').count(), 1);
    }
    await page.goto(`${base}/faqs`);
    assert.equal(await page.locator('main a[href="mailto:admin@HETVopportunities.com"]').count(), 1);
    console.log(`${width}×${height}: core ${Math.round(core.height)}px, commitments ${Math.round(commitmentHeight)}px; archive links, feedback removal, FAQ, keyboard and overflow passed`);
    await page.close();
  }

  const page = await browser.newPage();
  const programmes = await (await page.request.get(`${origin}/api/public/programmes`)).json();
  const mixed = "Introduction.\n\n• First\n• Second\n\nConclusion.";
  const fixture = { ...programmes[1], training: [mixed] };
  await page.route("**/api/public/programmes/director-pathway", (route) => route.fulfill({ json: fixture }));
  await page.goto(`${base}/opportunities/director-pathway`);
  await page.getByText("Conclusion.", { exact: true }).waitFor();
  assert.equal(await page.locator(".opp-block").filter({ has: page.getByRole("heading", { name: "Training & Development" }) }).locator("ul > li").count(), 2);
  console.log("Mixed paragraphs and bullets render on the public detail page (mocked content; no record writes)");
  await page.close();
} finally {
  await browser.close();
}
