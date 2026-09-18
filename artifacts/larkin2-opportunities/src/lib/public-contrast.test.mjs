import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8") + "\n" +
  readFileSync(new URL("../paper-orange.css", import.meta.url), "utf8");
const tokens = { ink: "#1d2020", secondary: "#4f4b45", muted: "#595650", "accent-text": "#943719", orange: "#f4773f", stage: "#f4f1ed", paper: "#e9e5df", deep: "#f4f1ed" };
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("public text tokens meet WCAG AA on light surfaces", () => {
  for (const name of ["ink", "secondary", "muted", "accent-text"]) {
    assert.ok(css.includes(`--${name}: ${tokens[name]}`));
    for (const surface of ["stage", "paper", "deep"]) {
      assert.ok(ratio(tokens[name], tokens[surface]) >= 4.5, `${name} on ${surface} is below 4.5:1`);
    }
  }
  assert.ok(ratio(tokens.ink, tokens.orange) >= 4.5);
});

function declarationsFor(selector) {
  const declarations = {};
  // Read actual selector declarations, including comma-separated rule groups.
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim().split(",").map(s => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const declaration of match[2].split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0) declarations[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
    }
  }
  return declarations;
}
function resolveColor(value) {
  return value?.replace(/var\(--([a-z-]+)\)/g, (_, token) => tokens[token] ?? "");
}
test("actual orange buttons and hover/focus states use high-contrast dark labels", () => {
  for (const selector of [
    ".larkin2-page .larkin2-btn", ".larkin2-top .larkin2-header-cta",
    ".larkin2-top .larkin2-header-cta:hover", ".larkin2-top .larkin2-header-cta:focus-visible",
    ".roles-card-action .larkin2-link", ".roles-card-action .larkin2-link:hover",
    ".roles-card-action .larkin2-link:focus-visible",
    ".larkin2-page .larkin2-path .larkin2-link:hover",
    ".larkin2-page .larkin2-path .larkin2-link:focus-visible",
    '.hetv-subscription button[type="submit"]', '.hetv-subscription button[type="button"]',
  ]) {
    const rule = declarationsFor(selector);
    assert.ok(ratio(resolveColor(rule.color), resolveColor(rule.background)) >= 4.5, selector);
  }
});
test("small text on the orange role footer stays readable", () => {
  const surface = resolveColor(declarationsFor(".roles-detail-footer").background);
  for (const selector of [".roles-detail-footer .larkin2-eyebrow", ".roles-detail-footer .roles-chat-hint"]) {
    assert.ok(ratio(resolveColor(declarationsFor(selector).color), surface) >= 4.5, selector);
  }
});

test("formerly dark public panels use light surfaces, not the ink text token", () => {
  for (const selector of [".larkin2-commit-card-inner", ".larkin2-carousel-btn", ".opp-status-card", ".larkin2-about", ".roles-detail-page .larkin2-top"]) {
    const rules = [...css.matchAll(new RegExp(selector.replaceAll(".", "\\.") + " \\{[^}]*\\}", "g"))].map(match => match[0]);
    const rule = rules.filter(rule => rule.includes("background:")).at(-1) ?? "";
    assert.match(rule, /background: var\(--(?:deep|stage|paper)\)/, `${selector} must use a light surface`);
    assert.doesNotMatch(rule, /background: var\(--ink\)/);
  }
});