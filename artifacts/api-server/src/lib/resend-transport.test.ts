import assert from "node:assert/strict";
import test from "node:test";
import { createResendTransport, emailAddress, sendResendEmail, type ResendTransport } from "./resend-transport";
import { createContactDelivery } from "./contact-delivery";
import { sendSubscriptionCode } from "./subscription-email-verification";
import { sendPublicationEmail, publicationSampleMessage } from "./publication-delivery";

const message = { from: "Hub <sender@example.com>", to: ["recipient@example.com"], subject: "Test", text: "Test body" };

test("direct transport uses runtime credentials, fixed origin, idempotency and no connector", async () => {
  let env = { RESEND_API_KEY: "re_placeholder_one" };
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const transport = createResendTransport({
    env: () => env,
    fetch: (async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return Response.json({ id: "accepted-id" });
    }) as typeof fetch,
  });
  assert.equal(await sendResendEmail(message, "stable-test-key", transport), "accepted-id");
  env = { RESEND_API_KEY: "re_placeholder_two" };
  await sendResendEmail(message, "stable-test-key", transport);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer re_placeholder_one");
  assert.equal(new Headers(calls[1].init.headers).get("authorization"), "Bearer re_placeholder_two");
  assert.equal(new Headers(calls[0].init.headers).get("idempotency-key"), "stable-test-key");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), message);
  await assert.rejects(transport("https://other.invalid", { method: "GET" }));
  assert.equal(calls.length, 2);
});

test("missing/invalid keys fail before a network request", async () => {
  for (const key of [undefined, "", "not-a-key", "re_bad\r\nheader"]) {
    const transport = createResendTransport({
      env: () => ({ RESEND_API_KEY: key }),
      fetch: (async () => { assert.fail("Must not call provider"); }) as typeof fetch,
    });
    await assert.rejects(sendResendEmail(message, undefined, transport), /RESEND_API_KEY/);
  }
});

test("provider rejection, malformed JSON and network errors are sanitized", async () => {
  for (const fetcher of [
    async () => Response.json({ error: "private recipient and credential" }, { status: 403 }),
    async () => new Response("not-json private recipient"),
    async () => { throw new Error("re_private credential and recipient"); },
  ]) {
    const transport = createResendTransport({ env: () => ({ RESEND_API_KEY: "re_placeholder" }), fetch: fetcher });
    await assert.rejects(sendResendEmail(message, undefined, transport), error => {
      assert.equal((error as Error).message, "Resend request failed; check configuration, permissions, quota, and connectivity");
      return true;
    });
  }
});

test("request timeout aborts a stalled provider", async () => {
  const keepAlive = setTimeout(() => {}, 200);
  try {
    const transport = createResendTransport({
      env: () => ({ RESEND_API_KEY: "re_placeholder" }), timeoutMs: 5,
      fetch: (async (_url, init) => new Promise((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      })) as typeof fetch,
    });
    await assert.rejects(sendResendEmail(message, undefined, transport), /Resend request failed/);
  } finally { clearTimeout(keepAlive); }
});

test("email acceptance requires a nonempty provider reference", async () => {
  for (const body of [null, {}, { id: "" }, { id: " " }, { id: 123 }]) {
    const transport: ResendTransport = async () => ({ ok: true, status: 200, json: async () => body });
    await assert.rejects(sendResendEmail(message, undefined, transport), /confirm acceptance/);
  }
  assert.throws(() => emailAddress("Name <sender@example.com>\r\nBcc: other@example.com", "Sender", true));
  assert.throws(() => emailAddress("bad", "Sender"));
});

test("enquiry, verification and publication use shared transport and runtime settings", async () => {
  const calls: Array<{ path: string; body: Record<string, unknown>; key?: string }> = [];
  const transport: ResendTransport = async (path, init) => {
    calls.push({ path, body: init.body ? JSON.parse(init.body) : {}, key: init.headers?.["Idempotency-Key"] });
    return { ok: true, status: 200, json: async () => path === "/domains"
      ? { data: [{ name: "example.com", status: "verified" }] } : { id: "provider-id" } };
  };
  const enquiry = { name: "Tester", email: "reply@example.com", subject: "Hello", message: "An enquiry", requestId: "test-request" };
  await createContactDelivery({ proxy: transport, from: () => "sender@example.com", to: () => "office@example.com" }).send(enquiry);
  assert.deepEqual(calls[1].body.to, ["office@example.com"]);
  assert.equal(calls[1].body.reply_to, "reply@example.com");
  assert.equal(calls[1].key, "hetv-contact/test-request");
  await assert.rejects(createContactDelivery({ proxy: transport, from: () => "sender@example.com", to: () => "invalid" }).send(enquiry));
  await sendSubscriptionCode("subscriber@example.com", "123456", {
    env: { SUBSCRIPTION_VERIFICATION_FROM: "Verification <sender@example.com>" }, transport,
  });
  assert.equal(calls[2].body.from, "Verification <sender@example.com>");
  assert.match(String(calls[2].body.text), /123456/);
  await assert.rejects(sendSubscriptionCode("subscriber@example.com", "123456", { env: {}, transport }));
  const sample = publicationSampleMessage({
    from: "Alerts <sender@example.com>", siteUrl: "https://example.com/larkin2-opportunities/",
    testEmail: "approved@example.com",
  });
  assert.equal(await sendPublicationEmail(sample, transport), "provider-id");
  assert.deepEqual(calls[3].body.to, ["approved@example.com"]);
  assert.equal(calls[3].key, sample.idempotencyKey);
  assert.match(String(calls[3].body.text), /larkin2-opportunities\/unsubscribe/);
});
