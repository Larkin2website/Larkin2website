import assert from "node:assert/strict";
import test from "node:test";
import { createEmailQuotaService } from "./email-quota";
import { budgetFailure, effectiveWindow, parseUsage, type EmailReservation, type QuotaState, type QuotaStore } from "./email-quota-core";
import { EmailDeliveryError } from "./resend-errors";
import type { ResendRequest, ResendTransport } from "./resend-transport";

class MemoryStore implements QuotaStore {
  states = new Map<string, QuotaState>();
  rows = new Map<string, EmailReservation[]>();
  private tail: Promise<unknown> = Promise.resolve();
  lock<T>(account: string, _key: string | undefined, run: Parameters<QuotaStore["lock"]>[2]): Promise<T> {
    const result = this.tail.then(async () => {
      const state = structuredClone(this.states.get(account) ?? {});
      const rows = structuredClone(this.rows.get(account) ?? []);
      const value = await run({
        state, reservations: rows,
        get: async id => rows.find(row => row.id === id),
        put: async row => {
          const index = rows.findIndex(item => item.id === row.id);
          if (index < 0) rows.push(row); else rows[index] = row;
        },
      });
      this.states.set(account, state);
      this.rows.set(account, rows);
      return value as T;
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
}
function fixture() {
  const clock = { at: new Date("2026-11-02T12:00:00Z") };
  const daily = { used: 0, limit: 100 as number | null, resets_at: "2026-11-03T00:00:00.000Z" };
  const monthly = { used: 0, limit: 3000 as number | null, resets_at: "2026-12-01T00:00:00.000Z" };
  const env: NodeJS.ProcessEnv = {
    RESEND_API_KEY: "re_placeholder", RESEND_ACCOUNT_ID: "client-test",
    EMAIL_ADMIN_FROM: "Admin <sender@example.com>", EMAIL_ADMIN_TO: "admin@example.com",
    EMAIL_ADMIN_RESERVE: "1", EMAIL_TRANSACTIONAL_RESERVE: "5",
  };
  const store = new MemoryStore();
  let usageRequests = 0;
  const sent = new Map<string, { id: string; init: ResendRequest }>();
  const provider = { error: undefined as EmailDeliveryError | undefined, usageError: false, loseResponse: false };
  const transport: ResendTransport = async (path, init) => {
    if (path === "/usage") {
      usageRequests++;
      if (provider.usageError) throw new EmailDeliveryError("unconfigured");
      return { ok: true, status: 200, json: async () => ({ emails: { daily, monthly } }) };
    }
    if (provider.error) throw provider.error;
    const key = new Headers(init.headers).get("Idempotency-Key")!;
    if (!sent.has(key)) {
      const count = JSON.parse(init.body!).to.length;
      daily.used += count; monthly.used += count;
      sent.set(key, { id: `provider-${sent.size + 1}`, init });
    }
    if (provider.loseResponse) { provider.loseResponse = false; throw new EmailDeliveryError("unavailable", undefined, true); }
    return { ok: true, status: 200, json: async () => ({ id: sent.get(key)!.id }) };
  };
  const service = () => createEmailQuotaService({ store, transport, env: () => env, now: () => clock.at });
  const advance = (ms = 1001) => { clock.at = new Date(clock.at.getTime() + ms); };
  const send = (s = service(), key = "test-1", purpose: ResendRequest["purpose"] = "publication", count = 1, notAfter?: Date) =>
    s.dispatch("/emails", {
      method: "POST", purpose, notAfter, headers: { "Idempotency-Key": key },
      body: JSON.stringify({ from: "sender@example.com", to: Array(count).fill("test@example.com"), subject: "Test", text: "Test" }),
    });
  return { clock, daily, monthly, env, store, provider, sent, service, advance, send, usageRequests: () => usageRequests };
}

test("quota parser validates counters, null paid daily caps and provider reset timestamps", () => {
  const f = fixture();
  const snapshot = parseUsage({ emails: { daily: { ...f.daily, limit: null }, monthly: f.monthly } }, f.clock.at, "key");
  assert.equal(snapshot.daily.limit, null);
  assert.equal(snapshot.daily.resetsAt, f.daily.resets_at);
  for (const emails of [
    { daily: { ...f.daily, used: -1 }, monthly: f.monthly },
    { daily: f.daily, monthly: { ...f.monthly, limit: null } },
    { daily: { ...f.daily, resets_at: "yesterday" }, monthly: f.monthly },
    { daily: { ...f.daily, resets_at: "2020-01-01" }, monthly: f.monthly },
  ]) assert.throws(() => parseUsage({ emails }, f.clock.at, "key"), EmailDeliveryError);
});

test("shared budget reserves essential and warning capacity; recipient counts are enforced", async () => {
  const f = fixture();
  f.daily.used = 93;
  const service = f.service();
  await f.send(service);
  f.advance();
  await assert.rejects(f.send(service, "test-2"), (error: unknown) => (error as EmailDeliveryError).code === "daily_limit");
  assert.equal(f.sent.size, 1);
  await f.send(service, "essential", "transactional", 2);
  f.advance();
  await assert.rejects(f.send(service, "too-many-essential", "transactional", 4), EmailDeliveryError);
  const health = await service.health();
  assert.equal(health.daily.used, 96);
  assert.equal(health.daily.remaining, 4);
  assert.equal(health.status, "daily_limit");
});

test("concurrent last-slot requests cannot exceed budget; committed holds survive new service instances", async () => {
  const f = fixture();
  f.env.EMAIL_ADMIN_RESERVE = "0"; f.env.EMAIL_TRANSACTIONAL_RESERVE = "0";
  f.daily.limit = 1;
  const service = f.service();
  const results = await Promise.allSettled([f.send(service, "first"), f.send(f.service(), "second")]);
  assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(f.sent.size, 1);
  assert.equal((await f.service().health()).daily.used, 1);
});

test("provider snapshots include external/inbound usage and do not double count settled sends", async () => {
  const f = fixture();
  f.daily.used = 20; f.monthly.used = 500;
  const service = f.service();
  await f.send(service);
  assert.equal((await service.health()).daily.used, 21);
  f.advance(61_000);
  assert.equal((await service.health()).daily.used, 21);
  assert.equal((await service.health()).monthly.used, 501);
  f.daily.used = 80; f.monthly.used = 900; f.advance(61_000);
  assert.equal((await service.health()).daily.used, 80);
  assert.equal(f.usageRequests(), 3);
  // Provider accepted references are reused even after application restart.
  assert.equal((await (await f.send(f.service())).json() as { id: string }).id, "provider-1");
  assert.equal(f.sent.size, 1);
});

test("early admin warning is counted, deduplicated and never bypasses exhaustion", async () => {
  const f = fixture(); f.daily.used = 80;
  const service = f.service();
  await service.sendAdminWarning();
  assert.equal(f.sent.size, 1);
  assert.equal((await service.health()).adminNotice, "accepted");
  f.advance(61_000);
  await f.service().sendAdminWarning();
  assert.equal(f.sent.size, 1);
  const exhausted = fixture(); exhausted.daily.used = 100;
  await exhausted.service().sendAdminWarning();
  assert.equal(exhausted.sent.size, 0);
  assert.equal((await exhausted.service().health()).adminNotice, "unavailable");
});

test("quota resets and upgrades are provider-confirmed; monthly exhaustion outranks daily", async () => {
  const f = fixture(); f.daily.used = 100; f.monthly.used = 3000;
  const service = f.service();
  assert.equal((await service.health()).status, "monthly_limit");
  await assert.rejects(f.send(service), EmailDeliveryError);
  f.monthly.limit = 50_000; f.daily.limit = null;
  f.advance(61_000);
  assert.equal((await service.health()).status, "ready");
  await f.send(service);
  const reset = fixture(); reset.daily.used = 100;
  await reset.service().health();
  reset.clock.at = new Date("2026-11-03T00:00:01Z"); reset.daily.used = 0; reset.daily.resets_at = "2026-11-04T00:00:00Z";
  assert.equal((await reset.service().health()).daily.used, 0);
  await reset.send();
  // A month reset does not erase an unresolved hold.
  reset.monthly.used = 0; reset.monthly.resets_at = "2027-01-01T00:00:00Z";
  reset.daily.resets_at = "2026-12-02T00:00:00Z"; reset.clock.at = new Date("2026-12-01T00:00:01Z");
  assert.equal((await reset.service().health()).monthly.used, 0);
});

test("usage permission outages and stale snapshots stop sends without consuming recipient budget", async () => {
  const f = fixture(); const service = f.service();
  await service.health(); f.advance(61_000); f.provider.usageError = true;
  assert.equal((await service.health()).status, "unconfigured");
  await assert.rejects(f.send(service), EmailDeliveryError);
  assert.equal(f.sent.size, 0);
  assert.equal(f.store.rows.get("client-test")!.length, 0);
  f.provider.usageError = false; f.advance(61_000);
  assert.equal((await service.health()).status, "ready");
  f.env.RESEND_API_KEY = "";
  assert.equal((await service.health()).status, "unconfigured");
});

test("ambiguous acceptance is held and replayed with the same provider key; expired uncertainty requires review", async () => {
  const f = fixture(); const service = f.service();
  f.provider.loseResponse = true;
  await assert.rejects(f.send(service), EmailDeliveryError);
  assert.equal(f.sent.size, 1);
  f.advance(61_000);
  await f.send(f.service()); // provider key deduplicates a lost response
  assert.equal(f.sent.size, 1);
  const other = fixture(); other.provider.loseResponse = true;
  await assert.rejects(other.send(), EmailDeliveryError);
  other.advance(24 * 3_600_000);
  await assert.rejects(other.send(), (error: unknown) => (error as EmailDeliveryError).code === "unknown");
  assert.equal(other.sent.size, 1);
});

test("rate limits are distinguished from quotas; expired verification codes are never sent", async () => {
  const f = fixture(); const service = f.service();
  f.provider.error = new EmailDeliveryError("rate_limited", new Date(f.clock.at.getTime() + 5000));
  await assert.rejects(f.send(service), (error: unknown) => (error as EmailDeliveryError).code === "rate_limited");
  assert.equal((await service.health()).status, "rate_limited");
  f.provider.error = undefined; f.advance(6001);
  await assert.rejects(f.send(service, "expired-code", "transactional", 1, new Date(f.clock.at.getTime() - 1)), EmailDeliveryError);
  assert.equal(f.sent.size, 0);
  assert.equal(f.store.rows.get("client-test")?.filter(row => row.status === "pending").length, 0);
});

test("payload conflicts fail closed; key rotation forces usage resync but retains deduplication", async () => {
  const f = fixture(); const service = f.service(); await f.send(service);
  f.advance();
  await assert.rejects(f.send(service, "test-1", "transactional", 2), (error: unknown) => (error as EmailDeliveryError).code === "unknown");
  f.env.RESEND_API_KEY = "re_rotated_placeholder";
  await service.health();
  assert.equal(f.usageRequests(), 2);
  await f.send(service);
  assert.equal(f.sent.size, 1);
});

test("pure budget applies stale and uncertain cross-window holds conservatively", () => {
  const f = fixture();
  const snapshot = parseUsage({ emails: { daily: f.daily, monthly: f.monthly } }, f.clock.at, "key");
  const rows: EmailReservation[] = [{
    id: "pending", fingerprint: "payload", count: 1, status: "ambiguous", reference: null,
    dailyReset: "2026-11-02T00:00:00Z", monthlyReset: "2026-11-01T00:00:00Z",
    createdAt: f.clock.at, updatedAt: f.clock.at,
  }];
  assert.equal(effectiveWindow(snapshot, rows, "daily").used, 1);
  f.advance(121_000);
  assert.equal(budgetFailure({ snapshot }, rows, f.clock.at, "publication", 1, { admin: 1, transactional: 5 })?.code, "stale");
});
