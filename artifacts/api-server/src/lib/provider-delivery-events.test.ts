import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { crmProviderEventsTable, db } from "@workspace/db";
import { createResendWebhookRouter } from "../routes/resend-webhook";
import { parseResendEvent, providerTransition, verifyResendSignature } from "./provider-delivery-events";
import { isEligibleAudienceRecipient, publicationBatchStatus } from "./audience-crm-service";

const secret = `whsec_${Buffer.from("a-test-secret-with-sufficient-length").toString("base64")}`;
const eventBody = Buffer.from(JSON.stringify({
  type: "email.delivered", created_at: "2026-09-27T12:00:00Z",
  data: { email_id: "provider-123", to: ["not-trusted@example.com"] },
}));

function headers(body: Buffer, id = "event-1", timestamp = "1790510400") {
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.`).update(body).digest("base64");
  return { id, timestamp, signature: `v1,${signature}` };
}

test("Resend signature checks raw bytes, timestamp, secret and version", () => {
  const now = Number(headers(eventBody).timestamp) * 1000;
  assert.equal(verifyResendSignature(eventBody, headers(eventBody), secret, now), true);
  assert.equal(verifyResendSignature(Buffer.from(`${eventBody} `), headers(eventBody), secret, now), false);
  assert.equal(verifyResendSignature(eventBody, { ...headers(eventBody), signature: "v1,invalid" }, secret, now), false);
  assert.equal(verifyResendSignature(eventBody, { ...headers(eventBody), signature: "v2,invalid" }, secret, now), false);
  assert.equal(verifyResendSignature(eventBody, headers(eventBody), secret, now + 301_000), false);
  assert.equal(verifyResendSignature(eventBody, headers(eventBody), undefined, now), false);
});

test("provider payload requires a valid email reference and timestamp", () => {
  assert.deepEqual(parseResendEvent(eventBody, "event-1"), {
    id: "event-1", providerReference: "provider-123", event: "email.delivered",
    occurredAt: new Date("2026-09-27T12:00:00Z"),
  });
  assert.equal(parseResendEvent(Buffer.from('{"type":"email.bounced","created_at":"invalid","data":{"email_id":"x"}}'), "id"), null);
  assert.equal(parseResendEvent(Buffer.from('{"type":"email.complained","created_at":"2026-09-27T12:00:00Z","data":{}}'), "id"), null);
  assert.equal(parseResendEvent(Buffer.from("not json"), "id"), null);
});

test("reordered and duplicate events never undo delivery failures", () => {
  const delivered = providerTransition("sent", null, ["email.delivered", "email.delivered"]);
  assert.deepEqual(delivered, { status: "delivered", suppression: null });
  assert.deepEqual(providerTransition("delivered", null, ["email.bounced", "email.delivered"]), {
    status: "failed", suppression: "bounce",
  });
  assert.deepEqual(providerTransition("sent", null, ["email.complained", "email.bounced"]), {
    status: "failed", suppression: "complaint",
  });
  assert.deepEqual(providerTransition("failed", "bounce", ["email.delivered"]), {
    status: "failed", suppression: "bounce",
  });
  assert.equal(providerTransition("processing", null, ["email.delivered"]), null);
  assert.equal(providerTransition("failed", null, ["email.delivered"]), null);
  const eligible = {
    active: true, consent: true, deliverySuppression: "bounce", allOpportunities: true,
    contentTypes: ["role"], careerLevels: [], craft: null, crafts: [], interests: [],
  };
  assert.equal(isEligibleAudienceRecipient(eligible, {
    contentType: "role", careerLevels: [], crafts: [], tags: [],
  }), false);
  assert.equal(publicationBatchStatus(["delivered", "delivered"]), "delivered");
  assert.equal(publicationBatchStatus(["delivered", "sent"]), "sent");
  assert.equal(publicationBatchStatus(["delivered", "failed"]), "failed");
  assert.equal(publicationBatchStatus(["delivered", "pending"]), "pending");
});

test("event IDs are unique for provider replay protection", () => {
  assert.ok(crmProviderEventsTable.id.primary);
  const insert = db.insert(crmProviderEventsTable).values({
    id: "event-1", providerReference: "provider-123", event: "email.bounced",
    occurredAt: new Date("2026-09-27T12:00:00Z"),
  }).onConflictDoNothing().toSQL();
  assert.match(insert.sql, /on conflict do nothing/);
});

test("webhook rejects unverified requests and accepts unknown references without suppressing addresses", async () => {
  const received: string[] = [];
  const app = express();
  app.use(express.raw({ type: "application/json" }));
  app.use(createResendWebhookRouter(async event => {
    received.push(event.providerReference);
    return false; // Unknown reference: only a persisted outbox reference may suppress a subscriber.
  }, () => secret));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/webhooks/resend`;
    const ts = String(Math.floor(Date.now() / 1000));
    const signed = headers(eventBody, "event-1", ts);
    const send = (body: Buffer, signature: string | undefined) => fetch(url, {
      method: "POST", headers: {
        "content-type": "application/json", "svix-id": signed.id,
        "svix-timestamp": signed.timestamp, ...(signature ? { "svix-signature": signature } : {}),
      }, body,
    });
    assert.equal((await send(eventBody, undefined)).status, 401);
    assert.equal((await send(Buffer.from("{}"), signed.signature)).status, 401);
    assert.deepEqual(received, []);
    assert.equal((await send(eventBody, signed.signature)).status, 204);
    assert.deepEqual(received, ["provider-123"]);
    assert.equal((await send(eventBody, signed.signature)).status, 204);
    assert.deepEqual(received, ["provider-123", "provider-123"]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});