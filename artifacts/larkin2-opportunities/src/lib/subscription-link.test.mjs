import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeSubscriptionFragment, tokenFromLink } from "./subscription-link.ts";

test("private fragments are consumed without changing the route or history state", () => {
  const state = { preserved: true };
  const browser = {
    location: { hash: "#token=" + "a".repeat(43), pathname: "/larkin2-opportunities/unsubscribe", search: "?source=saved" },
    history: {
      state,
      replaceState(nextState, title, path) {
        assert.equal(nextState, state);
        assert.equal(path, "/larkin2-opportunities/unsubscribe?source=saved");
        browser.location.hash = "";
      },
    },
  };
  assert.equal(consumeSubscriptionFragment(browser), "a".repeat(43));
  assert.equal(browser.location.hash, "");
  assert.equal(consumeSubscriptionFragment(browser), null);
  // A second same-page navigation is consumed independently, not just on mount.
  browser.location.hash = "#token=" + "b".repeat(43);
  assert.equal(consumeSubscriptionFragment(browser), "b".repeat(43));
  assert.equal(browser.location.hash, "");
});

test("tokenless visits and pasted links are handled without email lookup", () => {
  const browser = { location: { hash: "#content" }, history: { replaceState() { assert.fail("Unexpected history change"); } } };
  assert.equal(consumeSubscriptionFragment(browser), null);
  assert.equal(tokenFromLink("https://example.invalid/larkin2-opportunities/unsubscribe#token=" + "a".repeat(43)), "a".repeat(43));
});