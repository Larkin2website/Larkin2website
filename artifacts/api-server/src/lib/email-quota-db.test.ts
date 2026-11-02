import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool, emailQuotaAccountsTable, emailReservationsTable } from "@workspace/db";
import { drizzleQuotaStore } from "./email-quota-store";
import { createEmailQuotaService } from "./email-quota";

after(async () => { await pool.end(); });

test("PostgreSQL account locks fence simultaneous reservations and acceptance survives a service restart", async () => {
  const account = `quota-test-${randomUUID()}`;
  let sends = 0;
  const at = new Date();
  const tomorrow = new Date(at.getTime() + 86_400_000).toISOString();
  const month = new Date(at.getTime() + 32 * 86_400_000).toISOString();
  const makeService = () => createEmailQuotaService({
    store: drizzleQuotaStore, now: () => at,
    env: () => ({ RESEND_API_KEY: "re_placeholder_db_test", RESEND_ACCOUNT_ID: account,
      EMAIL_ADMIN_RESERVE: "0", EMAIL_TRANSACTIONAL_RESERVE: "0" }),
    transport: async path => {
      if (path === "/usage") return {
        ok: true, status: 200, json: async () => ({ emails: {
          daily: { used: 0, limit: 1, resets_at: tomorrow },
          monthly: { used: 0, limit: 10, resets_at: month },
        } }),
      };
      sends++;
      await new Promise(resolve => setTimeout(resolve, 15));
      return { ok: true, status: 200, json: async () => ({ id: "db-provider-reference" }) };
    },
  });
  const send = (key: string) => makeService().dispatch("/emails", {
    method: "POST", headers: { "Idempotency-Key": key }, purpose: "publication",
    body: JSON.stringify({ from: "sender@example.com", to: ["test@example.com"], subject: "DB isolation test", text: "Mock only" }),
  });
  try {
    const results = await Promise.allSettled([send("first"), send("second")]);
    assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
    assert.equal(sends, 1);
    const winner = results[0].status === "fulfilled" ? "first" : "second";
    const reference = await (await send(winner)).json() as { id: string };
    assert.equal(reference.id, "db-provider-reference");
    assert.equal(sends, 1);
    const [row] = await db.select().from(emailReservationsTable).where(eq(emailReservationsTable.account, account));
    assert.equal(row.status, "accepted");
    assert.equal((await makeService().health()).daily.used, 1);
  } finally {
    await db.delete(emailReservationsTable).where(eq(emailReservationsTable.account, account));
    await db.delete(emailQuotaAccountsTable).where(eq(emailQuotaAccountsTable.id, account));
  }
});
