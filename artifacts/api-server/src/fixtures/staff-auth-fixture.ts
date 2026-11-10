import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pool } from "@workspace/db";

// Imported only by isolated integration tests and the explicit browser fixture
// command. Application startup never imports or executes this module.
export async function createAuthFixture(origin: string) {
  if (process.env.NODE_ENV === "production") throw new Error("Fixtures cannot run in production");
  process.chdir(fileURLToPath(new URL("../../../../", import.meta.url)));
  const schema = `auth_fixture_${randomUUID().replaceAll("-", "")}`;
  if (!/^auth_fixture_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid fixture namespace");
  pool.options.max = 1;
  pool.options.idleTimeoutMillis = 0;
  process.env.SESSION_SECRET = randomUUID() + randomUUID();
  process.env.STAFF_AUTH_ORIGIN = origin;
  process.env.STAFF_AUTH_FROM = "HETV fixture <staff@example.invalid>";
  process.env.RESEND_ACCOUNT_ID = "isolated-staff-fixture";
  process.env.EMAIL_WORKERS_ENABLED = "false";
  process.env.SERVE_STATIC_APPS = "true";
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_WEBHOOK_SECRET;
  await pool.query(`CREATE SCHEMA "${schema}"`);
  try {
    // Never fall back to client tables if an interrupted fixture loses its
    // schema. PostgreSQL still resolves built-ins through implicit pg_catalog.
    await pool.query(`SET search_path TO "${schema}"`);
    for (const migration of ["0000_render_baseline.sql", "0001_staff_auth.sql"]) {
      const sql = await readFile(new URL(`../../../../lib/db/migrations/${migration}`, import.meta.url), "utf8");
      await pool.query(sql.replaceAll('"public".', `"${schema}".`));
    }
    const messages: Array<{ to: string[]; text: string; reference: string }> = [];
    const { bootstrapStaff } = await import("../lib/staff-accounts");
    const { processStaffMail } = await import("../lib/staff-mail");
    const drain = async () => processStaffMail(async message => {
      const reference = randomUUID();
      messages.push({ to: message.to, text: message.text, reference });
      return reference;
    });
    await bootstrapStaff("admin@example.invalid", "Fixture administrator");
    await drain();
    const { default: app } = await import("../app");
    return { app, messages, drain, schema, async cleanup() {
      await pool.query("SET search_path TO public");
      await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
      await pool.end();
    } };
  } catch (e) {
    await pool.query("SET search_path TO public");
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
    throw e;
  }
}
