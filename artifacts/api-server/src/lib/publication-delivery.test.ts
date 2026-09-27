import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { crmCommunicationOutboxTable, db, type audienceMatchingTable, type publicSubscriptionsTable } from "@workspace/db";
import { createAudienceCrmRouter } from "../routes/audience-crm";
import {
  canDeliverToSubscriber, claimedDeliveryWhere, deliverClaimedPublication, publicationDeliveryConfig,
  publicationMessage, type DeliveryConfig,
} from "./publication-delivery";
import { shouldEnqueueFirstPublication } from "./audience-crm-service";

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
});

test("controlled test endpoint cannot choose a recipient or bypass configuration", async () => {
  const calls: string[] = [];
  const app = express();
  app.use(express.json());
  app.use(createAudienceCrmRouter({
    requireCrmAccess: (_req, _res, next) => next(),
    deliveryConfig: () => ({}),
    sendTest: async id => { calls.push(id); throw new Error("TEST_NOT_CONFIGURED"); },
  }));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const settings = await fetch(`${base}/crm/communications/delivery-settings`);
    assert.deepEqual(await settings.json(), { testReady: false, liveEnabled: false });
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
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});