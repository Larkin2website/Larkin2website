import assert from "node:assert/strict";
import test from "node:test";
import { OPPORTUNITIES } from "../../artifacts/larkin2-opportunities/src/data/opportunities";
import { programmeSectionName, programmeSections } from "./programme-seed-data";

test("maps public programme headings to portal section categories", () => {
  assert.equal(programmeSectionName("Who Can Apply?"), "eligibility");
  assert.equal(programmeSectionName("Training & Development"), "training");
  assert.equal(programmeSectionName("Work Experience Placement"), "placement");
  assert.equal(programmeSectionName("Programme Timeline & Structure"), "timeline");
  assert.equal(programmeSectionName("How to Apply"), "application_guidance");
  assert.equal(programmeSectionName("Alumni Activities"), "about");
});

test("preserves every approved programme section in seed content", () => {
  for (const programme of Object.values(OPPORTUNITIES)) {
    const sections = programmeSections(programme);
    assert.equal(
      sections.length,
      programme.sections.reduce((total, section) => total + section.blocks.length, 0),
    );
    assert.ok(sections.every((section) => section.content.length > 0));
    assert.equal(new Set(sections.map(({ section, position }) => `${section}:${position}`)).size, sections.length);
  }

  const firstCredit = programmeSections(OPPORTUNITIES["first-credit"]);
  assert.ok(firstCredit.some((section) => section.content.includes("Alumni Activities")));
  assert.ok(firstCredit.some((section) => section.content.includes("Production: https://")));
  assert.ok(firstCredit.some((section) => section.content.includes("• Are aged 18 or over.")));
});