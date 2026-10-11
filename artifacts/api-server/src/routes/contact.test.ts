import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { createContactRouter } from "./contact";
import { createContactDelivery, CONTACT_RECIPIENT } from "../lib/contact-delivery";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";

const payload = (overrides: Record<string, unknown> = {}) => ({
  name: "Test Visitor", email: "visitor@example.com", subject: "An enquiry",
  message: "A test message.\nSecond line.", requestId: randomUUID(), website: "", ...overrides,
});
const noLimit: RequestHandler = (_req, _res, next) => next();
async function fixture(options: Parameters<typeof createContactRouter>[0] = {}) {
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.use(createContactRouter({ rateLimit: noLimit, ...options }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/public/contact`;
  return {
    post: (body: unknown, headers: Record<string, string> = {}) => fetch(base, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
    }),
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

test("anonymous contact validates and normalizes input before sending", async () => {
  const sent: unknown[] = [];
  const f = await fixture({ delivery: { send: async input => { sent.push(input); } } });
  try {
    for (const invalid of [
      { name: " " }, { email: "invalid" }, { subject: " " }, { message: " " },
      { message: "x".repeat(5001) }, { name: "x".repeat(101) }, { subject: "x".repeat(161) },
      { requestId: "invalid" }, { website: "spam" }, { extra: "not permitted" },
      { name: "name\nBcc: spam@example.com" }, { subject: "Test\r\nBcc: spam@example.com" },
      { message: "Null\u0000value" },
    ]) assert.equal((await f.post(payload(invalid))).status, 400);
    assert.equal(sent.length, 0);
    const response = await f.post(payload({ name: " Test Visitor ", email: " visitor@example.com ", message: " Message " }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json() as { status: string }).status, "accepted");
    assert.equal((sent[0] as { name: string }).name, "Test Visitor");
    assert.equal((sent[0] as { message: string }).message, "Message");
  } finally { await f.close(); }
});

test("no success before provider acceptance; simultaneous retries send once", async () => {
  let release!: () => void;
  let count = 0;
  const f = await fixture({ delivery: { send: async () => { count++; await new Promise<void>(r => { release = r; }); } } });
  try {
    const body = payload();
    let resolved = false;
    const first = f.post(body).then(r => { resolved = true; return r; });
    const second = f.post(body);
    while (!release) await new Promise(r => setTimeout(r, 5));
    await new Promise(r => setTimeout(r, 10));
    assert.equal(resolved, false);
    release();
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
    assert.equal(count, 1);
    assert.equal((await f.post(body)).status, 200);
    assert.equal(count, 1);
    assert.equal((await f.post({ ...body, message: "Changed" })).status, 400);
  } finally { await f.close(); }
});

test("provider failure never reports success and permits safe retry", async () => {
  let attempts = 0;
  const f = await fixture({ delivery: { send: async () => { if (++attempts === 1) throw new Error("provider details not exposed"); } } });
  try {
    const body = payload();
    const fail = await f.post(body);
    assert.equal(fail.status, 503);
    const text = await fail.text();
    assert(!text.includes("provider details"));
    assert(text.includes(CONTACT_RECIPIENT));
    assert.equal((await f.post(body)).status, 200);
  } finally { await f.close(); }
});

test("cross-site submissions, IP abuse and repeated email abuse are rejected", async () => {
  let sends = 0;
  const f = await fixture({ delivery: { send: async () => { sends++; } } });
  try {
    assert.equal((await f.post(payload(), { "Sec-Fetch-Site": "cross-site" })).status, 403);
    for (let i = 0; i < 3; i++) assert.equal((await f.post(payload())).status, 200);
    const response = await f.post(payload());
    assert.equal(response.status, 429);
    assert(Number(response.headers.get("retry-after")) > 0);
    assert.equal(sends, 3);
  } finally { await f.close(); }
  const g = await fixture({ delivery: { send: async () => {} }, rateLimit: createFixedWindowRateLimit({ limit: 1, windowMs: 60_000 }) });
  try {
    assert.equal((await g.post(payload())).status, 200);
    assert.equal((await g.post(payload({ email: "other@example.com" }))).status, 429);
  } finally { await g.close(); }
});

test("global delivery budget is bounded and windows recover", async () => {
  let now = 10_000;
  const f = await fixture({ now: () => now, delivery: { send: async () => {} } });
  try {
    for (let i = 0; i < 60; i++) assert.equal((await f.post(payload({ email: `visitor${i}@example.com` }))).status, 200);
    assert.equal((await f.post(payload({ email: "another@example.com" }))).status, 429);
    now += 3_600_001;
    assert.equal((await f.post(payload({ email: "another@example.com" }))).status, 200);
  } finally { await f.close(); }
});

test("mail transport requires explicit approved sender and verified domain, checks acceptance and uses Reply-To/idempotency", async () => {
  const calls: Array<{ path: string; options: { body?: string; headers?: Record<string, string> } }> = [];
  let mode = "accepted";
  const proxy = async (path: string, options: { body?: string; headers?: Record<string, string> }) => {
    calls.push({ path, options });
    return { ok: mode !== "rejected", status: mode === "rejected" ? 403 : 200, json: async () =>
      path === "/domains" ? { data: [{ name: "gentraxtech.com", status: mode === "unverified" ? "pending" : "verified" }] }
        : mode === "malformed" ? { message: "not acceptance" } : { id: "provider-id" } };
  };
  await assert.rejects(createContactDelivery({ proxy, from: () => undefined }).send(payload()));
  await assert.rejects(createContactDelivery({ proxy, from: () => "Bad\r\nsender" }).send(payload()));
  assert.equal(calls.length, 0);
  mode = "unverified";
  await assert.rejects(createContactDelivery({ proxy, from: () => "hetv@gentraxtech.com" }).send(payload()));
  assert.equal(calls.some(c => c.path === "/emails"), false);
  mode = "accepted";
  const service = createContactDelivery({ proxy, from: () => "hetv@gentraxtech.com" });
  const body = payload();
  await service.send(body);
  const mail = calls.find(c => c.path === "/emails")!;
  const sent = JSON.parse(mail.options.body!);
  assert.equal(sent.from, "HETV Opportunities Hub <hetv@gentraxtech.com>");
  assert.deepEqual(sent.to, [CONTACT_RECIPIENT]);
  assert.equal(sent.reply_to, body.email);
  assert.equal(mail.options.headers?.["Idempotency-Key"], `hetv-contact/${body.requestId}`);
  assert.equal(sent.html, undefined);
  assert(sent.text.includes(body.message));
  const domainChecks = calls.filter(c => c.path === "/domains").length;
  mode = "rejected";
  await assert.rejects(service.send(payload()));
  mode = "malformed";
  await assert.rejects(service.send(payload()));
  assert.equal(calls.filter(c => c.path === "/domains").length, domainChecks);
});
