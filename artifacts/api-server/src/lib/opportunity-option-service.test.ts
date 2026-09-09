import assert from "node:assert/strict";
import test from "node:test";
import { cleanOptionLabel, normalizeOptionLabel } from "./opportunity-option-service";

test("option labels normalize case and repeated whitespace", () => {
  assert.equal(normalizeOptionLabel("  Hair   & MAKEUP  "), "hair & makeup");
  assert.equal(cleanOptionLabel("  Hair   & MAKEUP  "), "Hair & MAKEUP");
});

test("cleaned option labels must remain between 2 and 100 characters", () => {
  assert.throws(() => cleanOptionLabel("   "), /INVALID_OPTION/);
  assert.throws(() => cleanOptionLabel(" a "), /INVALID_OPTION/);
  assert.throws(() => cleanOptionLabel("x".repeat(101)), /INVALID_OPTION/);
  assert.equal(cleanOptionLabel("AB"), "AB");
});