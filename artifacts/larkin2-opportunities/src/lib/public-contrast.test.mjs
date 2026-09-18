import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const tokens = { ink: "#1d2b23", secondary: "#4a5c50", muted: "#56665b", sage: "#506e58", stage: "#f8faf8", paper: "#edf2ed", deep: "#ffffff" };
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("public text tokens meet WCAG AA on light surfaces", () => {
  for (const name of ["ink", "secondary", "muted", "sage"]) {
    assert.ok(css.includes(`--${name}: ${tokens[name]}`));
    for (const surface of ["stage", "paper", "deep"]) {
      assert.ok(ratio(tokens[name], tokens[surface]) >= 4.5, `${name} on ${surface} is below 4.5:1`);
    }
  }
  assert.ok(ratio("#ffffff", tokens.sage) >= 4.5);
});

test("formerly dark public panels use light surfaces, not the ink text token", () => {
  for (const selector of [".larkin2-commit-card-inner", ".larkin2-carousel-btn", ".opp-status-card", ".larkin2-about", ".roles-detail-page .larkin2-top"]) {
    const rules = [...css.matchAll(new RegExp(selector.replaceAll(".", "\\.") + " \\{[^}]*\\}", "g"))].map(match => match[0]);
    const rule = rules.filter(rule => rule.includes("background:")).at(-1) ?? "";
    assert.match(rule, /background: var\(--(?:deep|stage|paper)\)/, `${selector} must use a light surface`);
    assert.doesNotMatch(rule, /background: var\(--ink\)/);
  }
});