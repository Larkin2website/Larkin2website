import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../pages/home.tsx");
const reference = read("../../../../.local/tasks/use-original-website-copy.md");

test("homepage includes the original introduction and all culture paragraphs", () => {
  const originalHome = reference.split("### Source: https://larkin2opportunities.com/roles/")[0];
  const paragraphs = originalHome.split("\n\n").filter((text) =>
    /^(Your central hub|At Larkin 2|We actively seek|Our production values|Welcome to the official home)/.test(text),
  );
  assert.equal(paragraphs.length, 5);
  for (const paragraph of paragraphs) assert.ok(home.includes(paragraph), paragraph);
});

test("HETV naming, existing sections and source CTA wording are retained", () => {
  for (const text of ["HETV Opportunities Hub", "View Live Roles", "Explore Opportunities", "Sign Up For Updates"]) {
    assert.ok(home.includes(text), text);
  }
  for (const id of ["signup", "about", "paths", "training", "development", "commitments", "faqs"]) {
    assert.ok(home.includes(`id="${id}"`), id);
  }
  const metadata = read("../../index.html");
  assert.ok(metadata.includes("<title>HETV Opportunities Hub</title>"));
  assert.ok(metadata.includes("Your central hub for jobs, training and development on Larkin 2"));
});

test("signup copy preserves consent and the no-email disclosure", () => {
  const signup = read("../components/subscription-signup.tsx");
  assert.ok(signup.includes("I want to receive updates."));
  assert.ok(signup.includes("I agree to my email being stored"));
  assert.ok(signup.includes("automated email alerts are not running yet"));
  assert.ok(signup.includes("No email has been sent."));
  assert.ok(signup.includes("existingManagementToken: savedSubscriptionToken()"));
});

test("roles use source wording without replacing live data or filters", () => {
  const roles = read("../pages/roles.tsx");
  assert.ok(roles.includes("Search Available roles here"));
  assert.ok(roles.includes("Find Jobs, Employment &amp; Career Opportunities"));
  for (const text of ["useListPublicOpportunities", "filter-status", "filter-department", "filter-role-type"]) {
    assert.ok(roles.includes(text), text);
  }
});