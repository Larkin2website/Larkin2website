import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const base = `${origin}/larkin2-opportunities`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium",
  args: ["--no-sandbox"],
});
const reports = [];
const axeOptions = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
  },
};

async function scan(page, name) {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate((options) => window.axe.run(document, options), axeOptions);
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  const entry = {
    name,
    url: page.url(),
    viewport: page.viewportSize(),
    violations: result.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
    incomplete: result.incomplete.map(({ id, nodes }) => ({ id, count: nodes.length })),
    overflow,
  };
  reports.push(entry);
  console.log(`${name}: ${entry.violations.length} rules, ${entry.violations.reduce((sum, rule) => sum + rule.nodes.length, 0)} nodes; horizontal overflow ${overflow.documentWidth > overflow.viewportWidth ? `${overflow.documentWidth}/${overflow.viewportWidth}` : "none"}`);
  for (const rule of entry.violations) {
    console.log(`  ${rule.impact} ${rule.id}: ${rule.nodes.map(({ target }) => target.join(" ")).slice(0, 8).join(" | ")}${rule.nodes.length > 8 ? ` (+${rule.nodes.length - 8})` : ""}`);
  }
}

try {
  for (const [width, height, label] of [[1280, 900, "desktop"], [390, 844, "mobile"], [320, 760, "400%-equivalent"]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const routes = ["/", "/roles", "/opportunities", "/training", "/development", "/faqs", "/privacy", "/terms", "/unsubscribe", "/preferences", "/a11y-not-found"];
    for (const route of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(route === "/" ? 3500 : 600);
      await scan(page, `${label} ${route}`);
      if (route === "/roles" || route === "/opportunities") {
        if (route === "/roles" && width === 1280) {
          await page.goto(`${base}/roles?q=zzzz-no-role-matches`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(600);
          await scan(page, "desktop /roles (empty search)");
          await page.goto(`${base}/roles`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(600);
        }
        const kind = route === "/roles" ? "roles" : "opportunities";
        const href = await page.locator(`a[href*="/${kind}/"]`).first().getAttribute("href").catch(() => null);
        if (href) {
          await page.goto(new URL(href, `${origin}`).href, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(600);
          await scan(page, `${label} /${kind}/:id`);
        }
      }
      if (route === "/" && width === 1280) {
        const signup = page.locator(".hetv-signup-compact");
        if (await signup.count()) {
          await signup.locator("#signup-name").fill("Accessibility test");
          await signup.locator("#signup-email").fill("accessibility@example.invalid");
          await signup.locator('input[type="checkbox"][required]').check();
          await signup.getByRole("button", { name: /continue to preferences/i }).click();
          await page.waitForURL(/\/preferences/);
          await scan(page, "desktop /preferences (active draft)");
          await page.getByLabel("Other", { exact: true }).check();
          await scan(page, "desktop /preferences (Other expanded)");
        }
      }
      if (route === "/unsubscribe" && width === 1280) {
        await page.route("**/api/public/subscriptions/code", route => route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ message: "If that address is subscribed, a code may arrive." }),
        }));
        await page.getByLabel("Email address").fill("accessibility@example.invalid");
        await page.getByRole("button", { name: "Send verification code" }).click();
        await page.getByLabel("Six-digit verification code").waitFor();
        await scan(page, "desktop /unsubscribe (code requested)");
        await page.getByRole("button", { name: "I already have a private link" }).click();
        await scan(page, "desktop /unsubscribe (legacy link revealed)");
        await page.route("**/api/public/subscriptions/code/verify", route => route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" }),
        }));
        await page.route("**/api/public/subscriptions/verified/preferences", route => route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            name: "Accessibility test", craft: "Editing", location: "London",
            interests: ["Mentoring"], contentTypes: ["role"], careerLevels: [],
            crafts: ["Sound"], allOpportunities: false,
          }),
        }));
        await page.getByLabel("Six-digit verification code").fill("123456");
        await page.getByRole("button", { name: "Verify and manage" }).click();
        await page.locator("#manage-name").waitFor();
        await scan(page, "desktop /unsubscribe (verified preferences, mocked API)");
        await page.unroute("**/api/public/subscriptions/code");
        await page.unroute("**/api/public/subscriptions/code/verify");
        await page.unroute("**/api/public/subscriptions/verified/preferences");
      }
    }
    if (width <= 390) {
      await page.goto(`${base}/roles`, { waitUntil: "domcontentloaded" });
      const opener = page.getByRole("button", { name: /open navigation menu/i });
      if (await opener.isVisible()) {
        await opener.click();
        await scan(page, `${label} mobile menu open`);
        await page.keyboard.press("Escape");
        console.log(`${label} menu Escape restores opener: ${await opener.evaluate(element => document.activeElement === element)}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (process.env.AUDIT_OUTPUT) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(process.env.AUDIT_OUTPUT, JSON.stringify(reports, null, 2));
}