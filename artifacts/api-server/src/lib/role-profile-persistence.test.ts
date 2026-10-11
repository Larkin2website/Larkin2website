import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { auditEventsTable, crmCommunicationsTable, db, opportunitiesTable, pool } from "@workspace/db";
import { createOpportunity, getOpportunity, updateOpportunity, transitionOpportunity, auditList } from "./opportunity-service";
import { permissionsForRole } from "./permissions";
import type { PortalActor } from "./portal-auth";

// Explicit opt-in, development only. Own test rows are removed; no existing roles are touched.
test("development persistence: profile round-trip, clearing, audit and lifecycle without emails", {
  skip: process.env.RUN_ROLE_PROFILE_DB_TEST !== "1" || process.env.NODE_ENV === "production",
}, async () => {
  const actor: PortalActor = {
    userId: `profile-test-${randomUUID()}`, displayName: "Profile test", email: "profile-test@example.com",
    role: "super_admin", permissions: permissionsForRole("super_admin"), demo: true,
  };
  const ids: string[] = [];
  const legacy = {
    slug: `profile-test-${randomUUID()}`, title: "Development test role", publicationLabel: "Roles",
    department: "CAMERA", roleType: "full time", summary: "This is a representative role purpose for a development-only test.",
    applicationDeadline: "Applications close 1 December at 17:00", applicationUrl: "https://example.com/apply",
    deadline: new Date("2026-12-01T00:00:00Z"), responseDate: "By 8 December",
    deadlineExtended: false, featured: false, urgent: false,
    contentItems: [{ section: "responsibility" as const, position: 0, content: "Support the camera team" }],
    details: [{ position: 0, label: "Location", value: "London" }, { position: 1, label: "Custom", value: "Retain me" }],
  };
  try {
    const created = await createOpportunity(legacy, actor);
    ids.push(created.id);
    const profile = {
      ...legacy, accountableTo: "Head of Camera", contractDatesHours: "10-hour days; hiatus 20–31 December",
      workArrangement: "hybrid" as const, worksCloselyWith: ["Camera", "Production"],
      additionalInformation: "Please include a portfolio link", applicationUrl: null,
      applicationEmail: "agreed@example.com", applicationClosingDate: "2026-12-01",
      applicationClosingTime: "17:00", applicationInstructions: "Send a CV",
      trainingApplicationInstructions: "Accessible formats welcomed",
      recruitmentRoute: "production" as const, shortlistSize: 8, interviewFormat: "virtual" as const,
      interviewDates: "unknown", technicalQuestions: ["Which tools would you use?"],
    };
    await updateOpportunity(created.id, profile, actor);
    const reopened = await getOpportunity(created.id);
    for (const key of ["accountableTo", "contractDatesHours", "worksCloselyWith", "technicalQuestions", "shortlistSize", "applicationEmail", "applicationClosingDate", "trainingApplicationInstructions"] as const) {
      assert.deepEqual(reopened[key], profile[key], key);
    }
    const switched = await updateOpportunity(created.id, { ...profile, recruitmentRoute: "independent" }, actor);
    assert.deepEqual(switched?.technicalQuestions, profile.technicalQuestions);
    assert.equal(switched?.shortlistSize, 8);
    assert.deepEqual(switched?.details.map(({ label, value }) => ({ label, value })), legacy.details.map(({ label, value }) => ({ label, value })));
    assert.equal((await transitionOpportunity(created.id, "published", actor))?.status, "published");
    assert.equal((await transitionOpportunity(created.id, "closed", actor))?.status, "closed");
    assert.deepEqual(await db.select().from(crmCommunicationsTable).where(eq(crmCommunicationsTable.opportunityId, created.id)), []);
    const cleared = await updateOpportunity(created.id, {
      ...profile, accountableTo: null, contractDatesHours: null, workArrangement: null,
      worksCloselyWith: [], additionalInformation: null, applicationEmail: null,
      applicationClosingDate: null, applicationClosingTime: null, applicationInstructions: null,
      trainingApplicationInstructions: null, recruitmentRoute: null, shortlistSize: null,
      interviewFormat: null, interviewDates: null, technicalQuestions: [], contentItems: [], details: [],
    }, actor);
    assert.equal(cleared?.accountableTo, null);
    assert.deepEqual(cleared?.technicalQuestions, []);
    assert.deepEqual(cleared?.contentItems, []);
    assert.deepEqual(cleared?.details, []);
    const audits = await auditList(created.id);
    const edits = audits.filter(event => event.action === "opportunity.updated");
    assert.equal(edits.length, 3);
    assert.ok(edits.some(event => (event.afterState as any)?.shortlistSize === 8));
    assert.ok(edits.some(event => (event.beforeState as any)?.accountableTo === profile.accountableTo && (event.afterState as any)?.accountableTo === null));
    const second = await createOpportunity({ ...legacy, slug: `profile-test-${randomUUID()}` }, actor);
    ids.push(second.id);
    assert.equal(second.accountableTo, null);
    assert.equal(second.applicationUrl, legacy.applicationUrl);
    assert.equal(second.status, "draft");
  } finally {
    if (ids.length) {
      await db.delete(auditEventsTable).where(and(inArray(auditEventsTable.opportunityId, ids), eq(auditEventsTable.actorUserId, actor.userId)));
      await db.delete(opportunitiesTable).where(and(inArray(opportunitiesTable.id, ids), eq(opportunitiesTable.createdBy, actor.userId)));
    }
    await pool.end();
  }
});
