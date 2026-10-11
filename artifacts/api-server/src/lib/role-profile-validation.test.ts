import assert from "node:assert/strict";
import test from "node:test";
import { CreatePortalOpportunityBody } from "@workspace/api-zod";
import { roleProfileValidationError } from "./role-profile-validation";

const valid = {
  slug: "profile-test", title: "Profile test", publicationLabel: "Roles", department: "CAMERA",
  roleType: "freelance", summary: "A role purpose with sufficient detail.", applicationDeadline: "Closing date to be agreed",
  deadlineExtended: false, featured: false, urgent: false, contentItems: [], details: [],
};
test("legacy and empty optional profiles remain valid without mandatory list counts", () => {
  assert.equal(CreatePortalOpportunityBody.safeParse(valid).success, true);
  assert.equal(CreatePortalOpportunityBody.safeParse({ ...valid, accountableTo: null, shortlistSize: null, technicalQuestions: [] }).success, true);
});
test("profile limits are enforced on the server", () => {
  for (const extra of [
    { shortlistSize: 4 }, { shortlistSize: 11 }, { shortlistSize: 5.5 },
    { technicalQuestions: ["one", "two", "three", "four"] }, { technicalQuestions: [""] },
    { worksCloselyWith: ["1", "2", "3", "4", "5", "6"] },
    { applicationEmail: "invalid" }, { workArrangement: "invented" },
    { applicationClosingTime: "25:00" }, { recruitmentRoute: "invented" },
  ]) assert.equal(CreatePortalOpportunityBody.safeParse({ ...valid, ...extra }).success, false, JSON.stringify(extra));
  assert.equal(CreatePortalOpportunityBody.safeParse({ ...valid, shortlistSize: 5, technicalQuestions: ["1", "2", "3"] }).success, true);
  assert.equal(CreatePortalOpportunityBody.safeParse({ ...valid, shortlistSize: 10 }).success, true);
});
test("application validation rejects unsafe and ambiguous targets and impossible dates", () => {
  for (const extra of [
    { applicationUrl: "javascript:alert(1)" }, { applicationUrl: "ftp://example.com" },
    { applicationEmail: "staff@example.com", applicationUrl: "https://example.com" },
    { applicationClosingDate: "2026-02-30" }, { applicationClosingDate: "2026-13-01" },
    { applicationClosingTime: "12:30" },
  ]) assert.ok(roleProfileValidationError(extra));
  for (const extra of [
    { applicationEmail: "agreed@example.com" }, { applicationUrl: "https://example.com/apply" },
    { applicationClosingDate: "2028-02-29", applicationClosingTime: "23:59" },
    {},
  ]) assert.equal(roleProfileValidationError(extra), undefined);
});
