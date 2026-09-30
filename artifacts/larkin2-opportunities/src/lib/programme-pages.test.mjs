import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../pages/home.tsx");
const layout = read("../components/layout.tsx");
const app = read("../App.tsx");

test("homepage keeps entry cards but no longer duplicates programme sections", () => {
  for (const category of ["training", "development"]) {
    assert.ok(!home.includes(`id="${category}"`));
    assert.ok(home.includes(`href="/${category}" testId="link-path-${category}"`));
  }
  assert.ok(!home.includes("No active training courses"));
  assert.ok(!home.includes("link-opp-first-credit"));
  assert.ok(!home.includes("link-opp-director"));
  assert.ok(!home.includes("link-opp-producer"));
  assert.equal((home.match(/className="larkin2-path larkin2-reveal"/g) ?? []).length, 3);
});

test("both overview pages are routed and discoverable in each navigation surface", () => {
  for (const [category, component] of [["training", "TrainingPage"], ["development", "DevelopmentPage"]]) {
    assert.ok(app.includes(`<Route path="/${category}" component={${component}} />`));
    for (const surface of ["nav", "mobile"]) {
      assert.ok(layout.includes(`href="/${category}" testId="link-${surface}-${category}"`));
    }
    assert.ok(!layout.includes(`href="#${category}"`));
  }
});

test("legacy redirects replace the history entry and do not discard search parameters", () => {
  assert.ok(app.includes("programmeRouteForHash(pathname, hash)"));
  assert.ok(app.includes("navigate(`${programmeRoute}${window.location.search}`, { replace: true })"));
  assert.ok(app.includes('addEventListener("hashchange", handleHash)'));
  assert.ok(app.includes('addEventListener("popstate", handleHash)'));
  assert.ok(app.includes('behavior: "instant"'));
});

test("overview pages retain the original guidance, programme links and truthful status", () => {
  const pages = read("../pages/programme-overview.tsx");
  for (const text of [
    "Helping you build the skills and knowledge you need to work confidently and effectively on production and beyond.",
    "Providing structured opportunities that support development at different career stages.",
    "Work experience and traineeships focus on learning and supported placements, rather than standard job recruitment.",
    "Check each listing for eligibility, support and pay.",
    "Free participation means no fees; it does not mean every course is paid.",
    "No active training courses",
    "No standalone training courses are currently listed. Approved courses, dates and eligibility will appear here when available.",
    "Designed for industry professionals looking to step up or transition into High-End Television drama.",
    'href="/opportunities/first-credit" testId="link-opp-first-credit"',
    'href="/opportunities/director-pathway" testId="link-opp-director"',
    'href="/opportunities/producer-pathway" testId="link-opp-producer"',
  ]) assert.ok(pages.includes(text), text);
  for (const id of ["first-credit", "director-pathway", "producer-pathway"]) {
    assert.ok(pages.includes(`OPPORTUNITIES["${id}"].applicationStatus`));
  }
  assert.equal((pages.match(/<h1\b/g) ?? []).length, 2);
  assert.equal((pages.match(/<main id="content">/g) ?? []).length, 2);
  assert.ok(!pages.includes("larkin2-reveal"));
  assert.ok(!pages.includes("larkin2-mask"));
  assert.ok(!pages.includes("Apply now"));
});