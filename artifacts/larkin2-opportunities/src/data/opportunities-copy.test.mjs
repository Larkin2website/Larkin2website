import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = readFileSync(new URL("./opportunities.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../pages/opportunity.tsx", import.meta.url), "utf8");

test("programme records retain source-specific eligibility and placement nuances", () => {
  for (const excerpt of [
    "Have no previous professional experience within the Film & Television industry.",
    "Where appropriate, a small number of additional applicants may also be invited to attend the Training & Development programme",
    "Have at least one directing (or 2nd unit directing) credit on either a distributed Feature OR High-End TV Drama. Please note, previous shadowing experience does not qualify.",
    "Scripted short films (they must have been screened at one or more BIFA recognised festivals)",
    "Applicants who have previously held producing roles in HETV may still be eligible where they have not worked in a producing capacity on a HETV drama production within the last 10 years",
    "Support doesn’t end when the placement finishes.",
    "Monday 28 September – Friday 2 October: Work Experience Placement Week #2",
    "* Exact weeks to be determined with the final participant.",
  ]) {
    assert.ok(data.includes(excerpt), `missing source excerpt: ${excerpt}`);
  }
});

test("all approved application destinations are recorded but closed programmes cannot show Apply now", () => {
  for (const destination of [
    "https://airtable.com/appfRovuxXYAc1ALL/pagOCOXepUDQCaqD6/form",
    "https://airtable.com/appE9uXkUrlrYyd27/paghj2syKZ1yjn2ct/form",
    "https://airtable.com/appgIOIHfQbmkRFVT/paghj2syKZ1yjn2ct/form",
  ]) {
    assert.ok(data.includes(destination));
  }

  assert.equal((data.match(/applicationStatus: "Closed"/g) ?? []).length, 3);
  assert.match(page, /!isSample && displayOpp\.status === "published"/);
  assert.match(page, /isOpen && displayOpp\.applicationUrl/);
});

test("department resources and truthful interest caveat remain available", () => {
  for (const department of [
    "Production",
    "Locations",
    "Assistant Directors",
    "Sustainability",
    "Art",
    "Costume",
    "Camera",
    "Electric / Sparks",
  ]) {
    assert.match(data, new RegExp(`label: "${department.replace("/", "\\/")}"`));
  }

  assert.ok(data.includes("Email alerts are not currently enabled."));
  assert.ok(page.includes("Email alerts are not currently enabled."));
  assert.ok(page.includes("Register interest"));
});