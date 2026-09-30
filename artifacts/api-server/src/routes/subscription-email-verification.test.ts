import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import { createSubscriptionVerificationService, type SubscriptionVerificationStore } from "../lib/subscription-email-verification";
import { createPublicSubscriptionsRouter } from "./public-subscriptions";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";
import type { SubscriptionPreferences } from "../lib/public-subscription-service";

class MemoryVerificationStore implements SubscriptionVerificationStore {
  readonly subscribers = new Map<string, { id: string; active: boolean; preferences: SubscriptionPreferences }>();
  readonly challenges = new Map<string, { hash: string; attempts: number; requested: number; at: number }>();
  readonly sessions = new Map<string, { id: string; expiresAt: Date }>();
  failSession = false;
  add(email: string, active = true) {
    this.subscribers.set(email, { id: email, active, preferences: { name: "Subscriber", interests: ["camera"], crafts: ["Editing"] } });
  }
  async subscriberId(email: string) { return this.subscribers.get(email)?.active ? email : undefined; }
  async reserve(email: string, hash: string, at: Date) {
    const existing = this.challenges.get(email);
    if (existing && at.getTime() - existing.at < 60_000) return false;
    if (existing && at.getTime() - existing.at < 3_600_000 && existing.requested >= 5) return false;
    this.challenges.set(email, { hash, attempts: 0, requested: (existing?.requested ?? 0) + 1, at: at.getTime() });
    return true;
  }
  async discard(email: string, hash: string) {
    if (this.challenges.get(email)?.hash === hash) this.challenges.delete(email);
  }
  async consumeAndCreate(email: string, hash: string, tokenHash: string, at: Date, expiresAt: Date) {
    const row = this.challenges.get(email);
    if (!row || row.attempts >= 5 || at.getTime() - row.at >= 600_000) return false;
    if (row.hash !== hash) { row.attempts++; return false; }
    if (!await this.subscriberId(email)) return false;
    if (this.failSession) throw new Error("Session storage unavailable");
    this.sessions.set(tokenHash, { id: email, expiresAt });
    this.challenges.delete(email);
    return true;
  }
  async resolveSession(hash: string, at: Date) {
    const session = this.sessions.get(hash);
    return session && session.expiresAt > at && this.subscribers.get(session.id)?.active ? session.id : undefined;
  }
  async getPreferences(id: string) { return this.subscribers.get(id)?.active ? this.subscribers.get(id)?.preferences : undefined; }
  async updatePreferences(id: string, preferences: SubscriptionPreferences) {
    const subscriber = this.subscribers.get(id);
    if (!subscriber?.active) return undefined;
    Object.assign(subscriber.preferences, preferences);
    return subscriber.preferences;
  }
  async unsubscribe(id: string) {
    const subscriber = this.subscribers.get(id);
    if (subscriber) subscriber.active = false;
    for (const [key, value] of this.sessions) if (value.id === id) this.sessions.delete(key);
  }
}

const noRateLimit: RequestHandler = (_req, _res, next) => next();
async function withServer(
  store: MemoryVerificationStore,
  run: (base: string, sent: Array<{ email: string; code: string }>, clock: { at: Date }) => Promise<void>,
  sendOverride?: (email: string, code: string) => Promise<void>,
  verificationRateLimit: RequestHandler = noRateLimit,
) {
  const sent: Array<{ email: string; code: string }> = [];
  const clock = { at: new Date("2026-01-02T03:04:05Z") };
  let codeNumber = 123456;
  const verification = createSubscriptionVerificationService(store, sendOverride ?? (async (email, code) => { sent.push({ email, code }); }), {
    secret: "test-only-verification-key", now: () => clock.at,
    makeCode: () => String(codeNumber++).padStart(6, "0"),
    makeToken: () => "s".repeat(43), requestDelayMs: 0,
  });
  const app = express();
  app.use(express.json());
  app.use(createPublicSubscriptionsRouter({
    verification, verificationRateLimit, signupRateLimit: noRateLimit,
    unsubscribeRateLimit: noRateLimit, preferencesRateLimit: noRateLimit,
  }));
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, sent, clock); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
function post(base: string, path: string, data: unknown, method = "POST") {
  return fetch(`${base}/public/subscriptions/${path}`, {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(data),
  });
}

test("verified subscriber updates preferences, unsubscribes, and loses access", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  await withServer(store, async (base, sent) => {
    const requested = await post(base, "code", { email: " MEMBER@EXAMPLE.COM " });
    assert.equal(requested.status, 200);
    assert.equal(requested.headers.get("cache-control"), "no-store");
    assert.equal(sent.length, 1);
    const unknown = await post(base, "code", { email: "missing@example.com" });
    assert.deepEqual(await requested.json(), await unknown.json());
    assert.equal(sent.length, 1);
    assert.equal((await post(base, "code/verify", { email: "missing@example.com", code: "123456" })).status, 401);
    const wrong = await post(base, "code/verify", { email: "member@example.com", code: "000000" });
    assert.equal(wrong.status, 401);
    const verified = await post(base, "code/verify", { email: "member@example.com", code: sent[0]!.code });
    assert.equal(verified.status, 200);
    const { accessToken } = await verified.json() as { accessToken: string };
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: sent[0]!.code })).status, 401);
    assert.equal((await post(base, "verified/preferences", { accessToken: "z".repeat(43) })).status, 401);
    const loaded = await post(base, "verified/preferences", { accessToken });
    assert.deepEqual((await loaded.json() as { interests: string[] }).interests, ["camera"]);
    const updated = await post(base, "verified/preferences", { accessToken, interests: ["mentoring"], crafts: ["Sound"] }, "PUT");
    assert.equal(updated.status, 200);
    assert.deepEqual((await updated.json() as { crafts: string[] }).crafts, ["Sound"]);
    const stopped = await post(base, "verified/unsubscribe", { accessToken });
    assert.equal(stopped.status, 200);
    assert.equal(store.subscribers.get("member@example.com")?.active, false);
    assert.equal((await post(base, "verified/preferences", { accessToken })).status, 401);
    assert.equal((await post(base, "verified/unsubscribe", { accessToken })).status, 401);
    assert.equal((await post(base, "code", { email: "member@example.com" })).status, 200);
    assert.equal(sent.length, 1);
  });
});

test("verified preference changes preserve legacy referral answers and validate new choices", async () => {
  const store = new MemoryVerificationStore();
  store.add("referral@example.com");
  const subscriber = store.subscribers.get("referral@example.com")!;
  Object.assign(subscriber.preferences, {
    acquisitionSource: "A previous free-text answer",
    acquisitionDetail: "Old detail",
    acquisitionDetailDeclined: false,
  });
  await withServer(store, async (base, sent) => {
    await post(base, "code", { email: "referral@example.com" });
    const verified = await post(base, "code/verify", { email: "referral@example.com", code: sent[0]!.code });
    const { accessToken } = await verified.json() as { accessToken: string };
    assert.equal((await post(base, "verified/preferences", { accessToken, interests: ["camera"] }, "PUT")).status, 200);
    assert.equal(subscriber.preferences.acquisitionSource, "A previous free-text answer");
    assert.equal((await post(base, "verified/preferences", {
      accessToken, acquisitionSource: "unapproved",
    }, "PUT")).status, 400);
    const changed = await post(base, "verified/preferences", {
      accessToken, acquisitionSource: "facebook_group", acquisitionDetailDeclined: true,
    }, "PUT");
    assert.equal(changed.status, 200);
    assert.equal((await changed.json() as { acquisitionDetailDeclined: boolean }).acquisitionDetailDeclined, true);
    assert.equal(subscriber.preferences.acquisitionDetail, null);
    assert.equal((await post(base, "verified/preferences", {
      accessToken, acquisitionDetail: "Person", acquisitionDetailDeclined: true,
    }, "PUT")).status, 400);
    assert.equal((await post(base, "verified/preferences", {
      accessToken, acquisitionSource: null,
    }, "PUT")).status, 200);
    assert.equal(subscriber.preferences.acquisitionDetailDeclined, false);
  });
});

test("expired and guessed codes never grant access; resending invalidates the old code", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  await withServer(store, async (base, sent, clock) => {
    await post(base, "code", { email: "member@example.com" });
    const first = sent[0]!.code;
    for (let i = 0; i < 5; i++) assert.equal((await post(base, "code/verify", { email: "member@example.com", code: "000000" })).status, 401);
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: first })).status, 401);
    clock.at = new Date(clock.at.getTime() + 61_000);
    await post(base, "code", { email: "member@example.com" });
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: first })).status, 401);
    clock.at = new Date(clock.at.getTime() + 601_000);
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: sent[1]!.code })).status, 401);
  });
});

test("delivery failure gives the same neutral response as unknown email and issues no code", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  await withServer(store, async base => {
    const failed = await post(base, "code", { email: "member@example.com" });
    const unknown = await post(base, "code", { email: "unknown@example.com" });
    assert.equal(failed.status, 200);
    assert.deepEqual(await failed.json(), await unknown.json());
    assert.equal(store.challenges.size, 0);
  }, async () => { throw new Error("private provider detail"); });
});

test("slow delivery and storage failures do not reveal subscriber status", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  let finishDelivery: (() => void) | undefined;
  await withServer(store, async base => {
    const active = await post(base, "code", { email: "member@example.com" });
    const unknown = await post(base, "code", { email: "unknown@example.com" });
    assert.equal(active.status, 200);
    assert.deepEqual(await active.json(), await unknown.json());
    assert.ok(finishDelivery, "provider is still waiting after HTTP response");
    finishDelivery();
    store.reserve = async () => { throw new Error("Unavailable challenge table"); };
    const broken = await post(base, "code", { email: "member@example.com" });
    const missing = await post(base, "code", { email: "unknown@example.com" });
    assert.equal(broken.status, 200);
    assert.deepEqual(await broken.json(), await missing.json());
  }, async () => new Promise<void>(resolve => { finishDelivery = resolve; }));
});

test("session persistence failure does not consume a valid code", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  await withServer(store, async (base, sent) => {
    await post(base, "code", { email: "member@example.com" });
    store.failSession = true;
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: sent[0]!.code })).status, 503);
    store.failSession = false;
    assert.equal((await post(base, "code/verify", { email: "member@example.com", code: sent[0]!.code })).status, 200);
  });
});

test("request and code checks are rate limited per requester", async () => {
  const store = new MemoryVerificationStore();
  store.add("member@example.com");
  await withServer(store, async base => {
    assert.equal((await post(base, "code", { email: "member@example.com" })).status, 200);
    const denied = await post(base, "code", { email: "other@example.com" });
    assert.equal(denied.status, 429);
    assert.deepEqual(await denied.json(), { error: "Too many requests" });
  }, undefined, createFixedWindowRateLimit({ limit: 1, windowMs: 60_000, maxKeys: 1 }));
});