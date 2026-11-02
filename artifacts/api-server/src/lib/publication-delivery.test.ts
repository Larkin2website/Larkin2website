import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { crmCommunicationOutboxTable, crmCommunicationsTable, db, type audienceMatchingTable, type publicSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAudienceCrmRouter } from "../routes/audience-crm";
import {
  canDeliverToSubscriber, claimedDeliveryWhere, deliverClaimedPublication, publicationDeliveryConfig,
  publicationMessage, publicationSampleMessage, publicationTestMessage, type DeliveryConfig,
} from "./publication-delivery";
import { shouldEnqueueFirstPublication } from "./audience-crm-service";
import { EmailDeliveryError } from "./resend-errors";

const config: DeliveryConfig = {
  from: "HETV Opportunities Hub <hetv@gentraxtech.com>",
  siteUrl: "https://larkin2opportunities.gentraxtech.com/larkin2-opportunities/",
  testEmail: "approved-test@example.com",
  activatedAt: new Date("2026-09-26T10:00:00Z"),
};
const role = { id: "role-1", kind: "role" as const, title: "Camera Assistant", slug: "camera-assistant", status: "published" };
const programme = { id: "programme-1", kind: "programme" as const, title: "Training Course", slug: "training-course", status: "published" };
const subscriber = {
  id: "subscriber-1", email: "subscribed@example.com", active: true, consent: true,
  allOpportunities: false, contentTypes: ["role"], careerLevels: [], crafts: [], interests: [], craft: null,
} as unknown as typeof publicSubscriptionsTable.$inferSelect;
const match = {
  contentType: "role", careerLevels: [], crafts: [], tags: [],
} as unknown as typeof audienceMatchingTable.$inferSelect;

test("only the first real publication queues recipients for either content type", () => {
  assert.equal(shouldEnqueueFirstPublication(null, "published", false), true);
  assert.equal(shouldEnqueueFirstPublication(null, "published", true), false);
  assert.equal(shouldEnqueueFirstPublication(null, "draft", false), false);
  assert.equal(shouldEnqueueFirstPublication(new Date(), "published", false), false);
  assert.equal(shouldEnqueueFirstPublication(new Date(), "closed", false), false);
});

test("delivery mode defaults off and controlled tests require a fixed mailbox", () => {
  const base = {
    PUBLIC_OPPORTUNITIES_URL: config.siteUrl, PUBLICATION_EMAIL_FROM: config.from,
    PUBLICATION_EMAIL_APPROVED: "true", PUBLICATION_ALERTS_ACTIVATED_AT: "2026-09-26T10:00:00Z",
  };
  assert.equal(publicationDeliveryConfig({}).live, undefined);
  assert.equal(publicationDeliveryConfig(base).live, undefined);
  assert.equal(publicationDeliveryConfig({ ...base, PUBLICATION_EMAIL_MODE: "live", PUBLICATION_EMAIL_APPROVED: "false" }).live, undefined);
  assert.equal(publicationDeliveryConfig({ ...base, PUBLICATION_EMAIL_MODE: "live",
    PUBLICATION_ALERTS_ACTIVATED_AT: "invalid" }).live, undefined);
  assert.equal(publicationDeliveryConfig({ ...base, PUBLICATION_TEST_EMAIL: "invalid" }).test, undefined);
  assert.equal(publicationDeliveryConfig({ ...base, PUBLICATION_TEST_EMAIL: config.testEmail }).test?.testEmail, config.testEmail);
  assert.ok(publicationDeliveryConfig({ ...base, PUBLICATION_EMAIL_MODE: "live" }).live);
});

test("role and programme messages have correct links and verification-based unsubscribe", () => {
  const roleMessage = publicationMessage(role, config, subscriber.email, "publication-123");
  assert.match(roleMessage.text, /larkin2-opportunities\/roles\/camera-assistant/);
  assert.match(roleMessage.text, /larkin2-opportunities\/unsubscribe/);
  assert.equal(roleMessage.to, subscriber.email);
  assert.equal(roleMessage.idempotencyKey, "publication-123");
  const testMessage = publicationMessage(programme, config, config.testEmail!, "publication-test-123", true);
  assert.match(testMessage.text, /larkin2-opportunities\/opportunities\/training-course/);
  assert.match(testMessage.subject, /^\[TEST\]/);
  assert.match(testMessage.text, /No subscribers were emailed/);
  assert.equal(testMessage.to, config.testEmail);
});

test("sample test is explicitly not a publication and deduplicates per approved mailbox and day", () => {
  const sample = publicationSampleMessage(config, new Date("2026-09-27T10:00:00Z"));
  const repeat = publicationSampleMessage(config, new Date("2026-09-27T17:00:00Z"));
  assert.equal(sample.to, config.testEmail);
  assert.equal(sample.idempotencyKey, repeat.idempotencyKey);
  assert.ok(!sample.idempotencyKey.includes(config.testEmail!));
  assert.match(sample.subject, /^\[TEST\]/);
  assert.match(sample.text, /No role or programme has been published for this test/);
  assert.match(sample.text, /larkin2-opportunities\/roles/);
  assert.match(sample.text, /larkin2-opportunities\/unsubscribe/);
});

test("batch preview idempotency follows the approved mailbox and exact message payload", () => {
  const first = publicationTestMessage(role, config);
  assert.equal(first.idempotencyKey, publicationTestMessage(role, config).idempotencyKey);
  assert.notEqual(first.idempotencyKey, publicationTestMessage(role, {
    ...config, testEmail: "different-approved@example.com",
  }).idempotencyKey);
  assert.notEqual(first.idempotencyKey, publicationTestMessage({
    ...role, title: "Camera Assistant (updated)",
  }, config).idempotencyKey);
  assert.notEqual(first.idempotencyKey, publicationTestMessage({
    ...role, slug: "new-camera-role",
  }, config).idempotencyKey);
});

test("dispatch checks matching, opt-out, publication status, retries, and provider deduplication", async () => {
  const sent: string[] = [];
  const send = async (message: ReturnType<typeof publicationMessage>) => {
    sent.push(message.idempotencyKey);
    return "resend-message-id";
  };
  const base = { id: "delivery-1", attempts: 1, firstAttemptAt: new Date("2026-09-26T10:10:00Z"),
    publication: role, subscriber, matching: match, config, at: new Date("2026-09-26T10:11:00Z") };
  assert.equal(canDeliverToSubscriber(subscriber, role, match), true);
  assert.equal(canDeliverToSubscriber(subscriber, programme, match), false);
  assert.equal(canDeliverToSubscriber({ ...subscriber, contentTypes: ["programme"] }, programme,
    { ...match, contentType: "programme" }), true);
  assert.deepEqual(await deliverClaimedPublication(base, send), { kind: "sent", reference: "resend-message-id" });
  assert.deepEqual(sent, ["publication-delivery-1"]);
  assert.deepEqual(await deliverClaimedPublication({ ...base, subscriber: { ...subscriber, active: false } }, send), { kind: "skipped" });
  assert.deepEqual(await deliverClaimedPublication({ ...base, subscriber: { ...subscriber, consent: false } }, send), { kind: "skipped" });
  assert.deepEqual(await deliverClaimedPublication({ ...base, publication: { ...role, status: "closed" } }, send), { kind: "skipped" });
  assert.deepEqual(await deliverClaimedPublication({ ...base, matching: { ...match, crafts: ["Sound"] } }, send), { kind: "skipped" });
  assert.equal(sent.length, 1);
  const failure = await deliverClaimedPublication(base, async () => { throw Error("Provider private detail"); });
  assert.equal(failure.kind, "failed");
  if (failure.kind === "failed") {
    assert.equal(failure.exhausted, false);
    assert.ok(failure.nextAttemptAt && failure.nextAttemptAt > base.at);
    assert.ok(!failure.reason.includes("Provider private detail"));
  }
  const exhausted = await deliverClaimedPublication({ ...base, attempts: 5 }, async () => { throw Error("reject"); });
  assert.equal(exhausted.kind, "failed");
  if (exhausted.kind === "failed") assert.equal(exhausted.nextAttemptAt, null);
  const expired = await deliverClaimedPublication({ ...base,
    at: new Date(base.firstAttemptAt.getTime() + 23 * 60 * 60_000) }, send);
  assert.equal(expired.kind, "failed");
  assert.equal(sent.length, 1);
});

test("claim completions are fenced to an exact attempt after lease expiry", () => {
  const id = "fca8e537-0c7d-4b2f-b693-9f1895e8d070";
  const stale = db.update(crmCommunicationOutboxTable)
    .set({ status: "failed" }).where(claimedDeliveryWhere(id, 1)).toSQL();
  const current = db.update(crmCommunicationOutboxTable)
    .set({ status: "sent" }).where(claimedDeliveryWhere(id, 2)).toSQL();
  assert.match(stale.sql, /"attempts" =/);
  assert.match(stale.sql, /"status" =/);
  assert.ok(stale.params.includes(1));
  assert.ok(current.params.includes(2));
  assert.ok(!current.params.includes(1));
  assert.ok(current.params.includes(id));
  const lock = db.select().from(crmCommunicationsTable)
    .where(eq(crmCommunicationsTable.id, id)).for("update").toSQL();
  assert.match(lock.sql.toLowerCase(), /for update/);
  const versioned = db.update(crmCommunicationOutboxTable).set({ attempts: 0, status: "pending" })
    .where(claimedDeliveryWhere(id, 1, 3)).toSQL();
  assert.match(versioned.sql, /"claim_version" =/);
  assert.ok(versioned.params.includes(3));
});

test("quota/configuration waits defer without ordinary failure; uncertain acceptance never becomes a quota wait", async () => {
  const at = new Date("2026-09-26T10:11:00Z");
  const base = { id: "delivery-1", attempts: 1, firstAttemptAt: at, publication: role, subscriber, matching: match, config, at };
  for (const code of ["daily_limit", "monthly_limit", "rate_limited", "unconfigured", "stale"] as const) {
    const outcome = await deliverClaimedPublication(base, async () => { throw new EmailDeliveryError(code, new Date("2026-10-01")); });
    assert.equal(outcome.kind, "deferred");
    if (outcome.kind === "deferred") {
      assert.equal(outcome.reason, code);
      assert(outcome.nextAttemptAt.getTime() <= at.getTime() + 60_000);
    }
  }
  const uncertain = await deliverClaimedPublication(base, async () => { throw new EmailDeliveryError("unavailable", undefined, true); });
  assert.equal(uncertain.kind, "failed");
  const review = await deliverClaimedPublication(base, async () => { throw new EmailDeliveryError("unknown", undefined, true); });
  assert.equal(review.kind, "failed");
  if (review.kind === "failed") assert.equal(review.exhausted, true);
  let sends = 0;
  assert.equal((await deliverClaimedPublication({ ...base, publication: { ...role, deadline: new Date("2026-09-25") } },
    async () => { sends++; return "not-sent"; })).kind, "skipped");
  assert.equal(sends, 0);
});

test("protected email-health and blocked-send contracts return safe actionable state", async () => {
  const app = express();
  app.use(express.json());
  const health = {
    status: "daily_limit" as const, message: new EmailDeliveryError("daily_limit").message,
    daily: { used: 94, limit: 100, remaining: 6, resetsAt: "2026-11-03T00:00:00Z" },
    monthly: { used: 1000, limit: 3000, remaining: 2000, resetsAt: "2026-12-01T00:00:00Z" },
    retryAt: "2026-11-03T00:00:00Z", lastSyncedAt: "2026-11-02T16:00:00Z",
    deferredCount: 9, adminNotice: "accepted" as const, billingUrl: "https://resend.com/settings/billing",
  };
  app.use(createAudienceCrmRouter({
    requireCrmAccess: (req, res, next) => req.headers["x-test-admin"] ? next() : res.status(403).end(),
    emailHealth: async () => health,
    sendSampleTest: async () => { throw new EmailDeliveryError("daily_limit", new Date(health.retryAt)); },
    sendTest: async () => { throw new EmailDeliveryError("monthly_limit"); },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(`${root}/crm/communications/email-health`)).status, 403);
    const response = await fetch(`${root}/crm/communications/email-health`, { headers: { "x-test-admin": "true" } });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), health);
    const blocked = await fetch(`${root}/crm/communications/test-sample`, { method: "POST", headers: { "x-test-admin": "true" } });
    assert.equal(blocked.status, 503);
    const body = await blocked.json() as { code: string; error: string };
    assert.equal(body.code, "daily_limit");
    assert.match(body.error, /Upgrade your Resend plan/);
    const blockedTest = await fetch(`${root}/crm/communications/fca8e537-0c7d-4b2f-b693-9f1895e8d070/test-send`,
      { method: "POST", headers: { "x-test-admin": "true" } });
    assert.equal((await blockedTest.json() as { code: string }).code, "monthly_limit");
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("controlled test endpoint cannot choose a recipient or bypass configuration", async () => {
  const calls: string[] = [];
  let sampleReady = false;
  const app = express();
  app.use(express.json());
  app.use(createAudienceCrmRouter({
    requireCrmAccess: (_req, _res, next) => next(),
    deliveryConfig: () => ({}),
    sendTest: async id => { calls.push(id); throw new Error("TEST_NOT_CONFIGURED"); },
    sendSampleTest: async () => {
      calls.push("sample");
      if (!sampleReady) throw new Error("TEST_NOT_CONFIGURED");
      return { status: "accepted", providerReference: "provider-test-reference" };
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const settings = await fetch(`${base}/crm/communications/delivery-settings`);
    assert.deepEqual(await settings.json(), {
      testReady: false, liveEnabled: false,
      trackingReady: !!process.env.RESEND_WEBHOOK_SECRET?.startsWith("whsec_"),
    });
    const id = "fca8e537-0c7d-4b2f-b693-9f1895e8d070";
    const bad = await fetch(`${base}/crm/communications/${id}/test-send`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "attacker@example.com" }),
    });
    assert.equal(bad.status, 400);
    assert.deepEqual(calls, []);
    const blocked = await fetch(`${base}/crm/communications/${id}/test-send`, { method: "POST" });
    assert.equal(blocked.status, 503);
    assert.deepEqual(calls, [id]);
    const sampleBad = await fetch(`${base}/crm/communications/test-sample`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "attacker@example.com" }),
    });
    assert.equal(sampleBad.status, 400);
    assert.deepEqual(calls, [id]);
    const sampleBlocked = await fetch(`${base}/crm/communications/test-sample`, { method: "POST" });
    assert.equal(sampleBlocked.status, 503);
    assert.deepEqual(calls, [id, "sample"]);
    sampleReady = true;
    const accepted = await fetch(`${base}/crm/communications/test-sample`, { method: "POST" });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { status: "accepted", providerReference: "provider-test-reference" });
    assert.deepEqual(calls, [id, "sample", "sample"]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});