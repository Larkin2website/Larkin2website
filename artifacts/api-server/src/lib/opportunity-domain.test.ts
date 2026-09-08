import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionStatus,
  isPublicStatus,
  toPublicStatus,
} from "./opportunity-domain";
import {
  CreatePortalOpportunityBody,
  ListPortalOpportunitiesQueryParams,
} from "@workspace/api-zod";

test("lifecycle permits publish, unpublish, close, fill, and archive paths", () => {
  assert.equal(canTransitionStatus("draft", "published"), true);
  assert.equal(canTransitionStatus("published", "draft"), true);
  assert.equal(canTransitionStatus("published", "closed"), true);
  assert.equal(canTransitionStatus("published", "filled"), true);
  assert.equal(canTransitionStatus("closed", "published"), true);
  assert.equal(canTransitionStatus("filled", "published"), false);
  assert.equal(canTransitionStatus("archived", "published"), false);
});

test("only public lifecycle states are exposed and labels stay compatible", () => {
  assert.equal(isPublicStatus("draft"), false);
  assert.equal(isPublicStatus("archived"), false);
  assert.equal(isPublicStatus("published"), true);
  assert.equal(toPublicStatus("published"), "Open");
  assert.equal(toPublicStatus("closed"), "Closed");
  assert.equal(toPublicStatus("filled"), "Filled");
});

test("generated validation rejects unsafe or incomplete opportunity input", () => {
  const invalid = CreatePortalOpportunityBody.safeParse({
    slug: "Invalid Slug",
    title: "A",
    applicationUrl: "javascript:alert(1)",
    contentItems: [],
    details: [],
  });
  assert.equal(invalid.success, false);
});

test("generated list validation coerces pagination and enforces limits", () => {
  const valid = ListPortalOpportunitiesQueryParams.parse({
    page: "2",
    pageSize: "25",
    status: "published",
  });
  assert.deepEqual(
    { page: valid.page, pageSize: valid.pageSize, status: valid.status },
    { page: 2, pageSize: 25, status: "published" },
  );

  assert.equal(
    ListPortalOpportunitiesQueryParams.safeParse({ pageSize: "101" }).success,
    false,
  );
});