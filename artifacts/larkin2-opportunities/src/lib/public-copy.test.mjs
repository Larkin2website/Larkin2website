import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../pages/home.tsx");
const reference = read("../../../../.local/tasks/use-original-website-copy.md");

test("homepage retains the original hero introduction", () => {
  const originalHome = reference.split("### Source: https://larkin2opportunities.com/roles/")[0];
  const paragraphs = originalHome.split("\n\n").filter((text) =>
    /^Your central hub/.test(text),
  );
  assert.equal(paragraphs.length, 1);
  for (const paragraph of paragraphs) assert.ok(home.includes(paragraph), paragraph);
});

test("About Us and the culture statement stay in separate ordered reveal groups beside the image", () => {
  const section = home.match(/<section[^>]+id="about"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  assert.equal((section.match(/<h2\b/g) ?? []).length, 1);
  assert.equal((section.match(/className="larkin2-split-content"/g) ?? []).length, 1);
  assert.equal((section.match(/className="larkin2-split-image"/g) ?? []).length, 1);
  assert.equal((section.match(/className="larkin2-split-panel larkin2-split-(?:about|culture)"/g) ?? []).length, 2);
  assert.equal((section.match(/className="larkin2-reveal" data-reveal/g) ?? []).length, 2);
  assert.ok(section.includes('className="larkin2-split-panel larkin2-split-about"'));
  assert.ok(section.includes('className="larkin2-split-panel larkin2-split-culture"'));
  assert.ok(section.indexOf("larkin2-split-image") < section.indexOf("larkin2-split-content"));
  assert.ok(section.includes('src="/larkin2-opportunities/images/production-culture.webp"'));
  assert.ok(section.includes('id="about-title"'));
  assert.ok(section.includes("About Us"));
  assert.ok(section.includes("Production Culture Statement"));
  const body = section.match(/<p>(.*?)<\/p>/g) ?? [];
  assert.equal(body.length, 3);
  assert.ok(body[0].includes("Through this platform we provide opportunities to apply for full-time crew roles"));
  assert.ok(body[1].includes("Please sign up to HETV Opportunities Hub to keep updated"));
  assert.ok(body[2].includes("Explore roles, work experience, training and development opportunities on Larkin 2"));
  assert.ok(body[2].includes("fair, inclusive recruitment"));
  assert.ok(!section.includes("HETV Opportunities Hub is operated by Larkin AV Limited."));
  assert.ok(!section.includes("AI-generated illustrations of television production"));
  assert.ok(!section.includes('href="/roles"'));
});

test("HETV naming, core-area ordering and exact calls to action are retained", () => {
  for (const text of ["HETV Opportunities Hub", "VIEW LIVE ROLES", "VIEW PROGRAMMES", "VIEW COURSES"]) {
    assert.ok(home.includes(text), text);
  }
  const cards = ["Training Courses", "Development Programmes", "Recruitment"];
  for (const [index, title] of cards.entries()) {
    assert.ok(home.indexOf(`<h3 className="larkin2-core-title">${title}</h3>`) > (index ? home.indexOf(`<h3 className="larkin2-core-title">${cards[index - 1]}</h3>`) : 0));
  }
  for (const id of ["signup", "about", "paths", "commitments", "faqs"]) {
    assert.ok(home.includes(`id="${id}"`), id);
  }
  assert.ok(home.indexOf('id="signup"') > home.indexOf('id="faqs"'));
  assert.ok(!home.includes("<video"));
  const metadata = read("../../index.html");
  assert.ok(metadata.includes("<title>HETV Opportunities Hub</title>"));
  assert.ok(metadata.includes("Your central hub for jobs, training and development on Larkin 2"));
});

test("signup copy preserves consent and the no-email disclosure", () => {
  const signup = read("../components/subscription-signup.tsx");
  assert.ok(home.includes("Sign up to be notified when new roles and opportunities become available through the Hub. You can update your preferences at any time."));
  assert.ok(signup.includes("I agree to HETV Opportunities Hub storing my name and email"));
  assert.ok(signup.includes("not sending automated marketing emails or opportunity alerts"));
  assert.ok(signup.includes("Signing up does not send an email."));
});

test("roles use approved wording without replacing live data or filters", () => {
  const roles = read("../pages/roles.tsx");
  assert.ok(roles.includes("Search Available roles here"));
  assert.ok(roles.includes("Find jobs and career opportunities"));
  for (const text of ["useListPublicOpportunities", "filter-status", "filter-department", "filter-role-type"]) {
    assert.ok(roles.includes(text), text);
  }
});