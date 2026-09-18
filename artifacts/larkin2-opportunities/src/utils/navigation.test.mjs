import assert from "node:assert/strict";
import test from "node:test";
import { programmeRouteForHash } from "./navigation.ts";

test("legacy homepage programme fragments map only to the two overview routes", () => {
  for (const pathname of ["", "/"]) {
    assert.equal(programmeRouteForHash(pathname, "#training"), "/training");
    assert.equal(programmeRouteForHash(pathname, "#development"), "/development");
    assert.equal(programmeRouteForHash(pathname, "#%74raining"), "/training");
  }
});

test("other pages, anchors and management fragments are left untouched", () => {
  for (const pathname of ["/training", "/development", "/unsubscribe", "/opportunities/first-credit"]) {
    assert.equal(programmeRouteForHash(pathname, "#training"), undefined);
    assert.equal(programmeRouteForHash(pathname, "#development"), undefined);
  }
  for (const hash of ["", "#signup", "#paths", "#content", "#about", "#commitments", "#top", "#faqs", "#token=example", "#training=example", "#%E0%A4%A"]) {
    assert.equal(programmeRouteForHash("/", hash), undefined);
  }
});