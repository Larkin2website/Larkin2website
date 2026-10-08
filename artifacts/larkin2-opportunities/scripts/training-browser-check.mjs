import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

// Read-only checks against real development records. No application form submissions.
const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const courses = JSON.parse(readFileSync(new URL("../../../scripts/data/training-courses.json", import.meta.url), "utf8"));
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const base = `${origin}/larkin2-opportunities`;
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const faults = [];
async function checkPage(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"] },
  }));
  assert.deepEqual(result.violations.map(v => ({id:v.id,nodes:v.nodes.map(n=>n.target)})), [], `${label}: accessibility`);
}
try {
  for (const width of [1280, 1024, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", error => faults.push(error.message));
    await page.goto(`${base}/training`);
    for (const c of courses) await page.getByRole("heading",{name:c.title,exact:true}).waitFor();
    assert.match(await page.getByTestId("training-open").innerText(), /Career Mapping Session/);
    assert.match(await page.getByTestId("training-unconfirmed").innerText(), /Departmental Budgeting/);
    for(const c of courses.filter(c=>c.status==="closed")) assert.match(await page.getByTestId("training-closed").innerText(),new RegExp(c.title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
    assert(await page.getByRole("heading",{name:"First Credit Work Experience",exact:true}).isVisible());
    await checkPage(page,`${width}px training`);
    await page.goto(`${base}/opportunities`);
    for (const c of courses) await page.getByRole("heading",{name:c.title,exact:true}).waitFor();
    await checkPage(page,`${width}px all opportunities`);
    await page.goto(`${base}/development`);
    await page.getByRole("heading",{name:"Creative Leadership Shadowing Programme: Director Pathway",exact:true}).waitFor();
    for(const c of courses) assert.equal(await page.getByRole("heading",{name:c.title,exact:true}).count(),0);
    for(const c of courses) {
      await page.goto(`${base}/opportunities/${c.slug}`);
      await page.getByRole("heading",{name:c.title,exact:true}).waitFor();
      const apply = page.getByTestId("link-opp-apply");
      assert.equal(await apply.count(),c.slug==="career-mapping-session"?1:0);
      if(c.slug==="career-mapping-session") assert.equal(await apply.getAttribute("href"),c.applicationUrl);
      else assert.equal(await page.locator('main a[href*="airtable.com"]').count(),0);
      assert(await page.locator(`main a[href="${c.sourceUrl}"]`).isVisible());
      const body = (await page.locator("main").innerText()).replace(/\s+/g," ");
      for(const s of c.sections.filter(s=>!s.content.startsWith("Original course listing:"))) {
        const plain = s.content.replace(/• /g,"").replace(/\s+/g," ");
        assert(body.includes(plain),`${c.slug}: missing source content ${plain.slice(0,60)}`);
      }
      if(c.sections.some(s=>s.content.includes("• "))) assert(await page.locator(".opp-main li").count()>0);
      await checkPage(page,`${width}px ${c.slug}`);
    }
    console.log(`${width}px: six real courses, original content, internal routes, category separation, gated provider links, accessibility and no overflow passed`);
    await page.close();
  }
  assert.deepEqual(faults,[]);
} finally { await browser.close(); }
