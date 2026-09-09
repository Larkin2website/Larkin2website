import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanOptionLabel,
  normalizeOptionLabel,
  resolveOptionLabel,
  validateMergeOptions,
} from "./opportunity-option-service";

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

test("a retired or renamed historical value remains valid only while editing its current opportunity", () => {
  assert.equal(resolveOptionLabel(undefined, "Old Department", "Old Department"), "Old Department");
  assert.equal(resolveOptionLabel({ label: "Old Department", active: false }, "Old Department", "Old Department"), "Old Department");
  assert.equal(resolveOptionLabel({ label: "Old Department", active: false }, "Old Department"), undefined);
  assert.equal(resolveOptionLabel({ label: "New Department", active: true }, "new department", "Old Department"), "New Department");
  assert.equal(
    resolveOptionLabel({ label: "ART DEPARTMENT", active: true }, "Art Department", "Art Department"),
    "Art Department",
  );
});

test("merge validation rejects duplicate, retired, mismatched, and missing targets", () => {
  const source = { id: "source", kind: "department" as const, active: true };
  const target = { id: "target", kind: "department" as const, active: true };
  assert.equal(validateMergeOptions(source, target), true);
  assert.equal(validateMergeOptions(source, { ...source }), false);
  assert.equal(validateMergeOptions(source, { ...target, active: false }), false);
  assert.equal(validateMergeOptions(source, { ...target, kind: "role_type" }), false);
  assert.equal(validateMergeOptions(source, undefined), false);
});