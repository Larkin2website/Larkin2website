import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type AddressInfo } from "node:net";
import { pool } from "@workspace/db";
import { createAuthFixture } from "../fixtures/staff-auth-fixture";

test("staff invitations, passwords, sessions, CSRF, permissions and recovery use isolated PostgreSQL", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const probe = createServer().listen(0, "127.0.0.1");
  await new Promise<void>(resolve => probe.once("listening", resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const fixture = await createAuthFixture(origin);
  const server = fixture.app.listen(port, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  let cookies = "";
  const password = "An isolated test password 42!";
  const token = (text: string) => text.match(/#token=([A-Za-z0-9_-]+)/)![1];
  const call = async (path: string, body?: object, options: { method?: string; csrf?: boolean; origin?: string; cookie?: string } = {}) => {
    const csrf = cookies.match(/hetv_staff_csrf=([^;]+)/)?.[1];
    const response = await fetch(`${origin}/api${path}`, {
      method: options.method ?? (body ? "POST" : "GET"),
      headers: { origin: options.origin ?? origin, "content-type": "application/json",
        cookie: options.cookie ?? cookies, ...(options.csrf === false ? {} : csrf ? { "x-staff-csrf": decodeURIComponent(csrf) } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const issued = response.headers.getSetCookie();
    if (issued.some(value => value.startsWith("hetv_staff_session="))) cookies = issued.map(value => value.split(";")[0]).join("; ");
    return response;
  };
  try {
    for (const flag of ["PUBLIC_TEST_LOGIN_ENABLED", "DEV_DEMO_LOGIN_ENABLED", "PORTAL_DEMO_MODE"]) process.env[flag] = "true";
    for (const scope of ["portal", "crm"]) {
      assert.equal((await call(`/${scope}/demo-session`, { email: "arbitrary@example.invalid", password: "anything" })).status, 404);
      assert.equal((await call(`/${scope}/demo-session`, undefined, { method: "DELETE" })).status, 404);
    }
    assert.equal((await call("/portal/session", undefined, { cookie: "__session=legacy; larkin2_demo_session=legacy" })).status, 401);
    assert.equal((await call("/auth/login", { email: "admin@example.invalid", password })).status, 401);
    const inviteToken = token(fixture.messages[0].text);
    const acceptance = await Promise.all([call("/auth/set-password", { token: inviteToken, password }), call("/auth/set-password", { token: inviteToken, password })]);
    assert.deepEqual(acceptance.map(r => r.status).sort(), [200, 400]);
    assert.equal((await call("/auth/login", { email: "ADMIN@example.invalid", password })).status, 200);
    const authenticatedCookies = cookies;
    await pool.query(`INSERT INTO portal_memberships(user_id,display_name,email,role,active)
      VALUES('legacy-fixture-admin','Legacy uncredentialed admin','legacy@example.invalid','super_admin',true)`);
    const { rows: [admin] } = await pool.query("SELECT user_id FROM staff_credentials WHERE normalized_email='admin@example.invalid'");
    assert.equal((await call(`/portal/members/${admin.user_id}`, { role: "viewer", active: true }, { method: "PATCH" })).status, 400,
      "a legacy uncredentialed admin must not permit removing the last working admin");
    assert.equal((await call("/portal/members")).status, 200);
    assert.equal((await call("/crm/communications")).status, 200);
    assert.equal((await call("/auth/logout", {}, { csrf: false })).status, 403);
    assert.equal((await call("/auth/logout", {}, { origin: "https://attacker.invalid" })).status, 403);
    const grant = await call("/portal/access-grants", { displayName: "Fixture viewer", email: "viewer@example.invalid", role: "viewer" });
    assert.equal(grant.status, 201);
    const person = await grant.json() as { id: string };
    const invitation = await call("/auth/invitations", { memberId: person.id });
    assert.equal(invitation.status, 201);
    const invitationId = (await invitation.json() as { id: string }).id;
    await fixture.drain();
    const revokedToken = token(fixture.messages.at(-1)!.text);
    assert.equal((await call(`/auth/invitations/${invitationId}`, undefined, { method: "DELETE" })).status, 204);
    assert.equal((await call("/auth/set-password", { token: revokedToken, password })).status, 400);
    assert.equal((await call(`/auth/invitations/${invitationId}/resend`, {})).status, 201);
    await fixture.drain();
    const viewerToken = token(fixture.messages.at(-1)!.text);
    assert.equal((await call("/auth/set-password", { token: viewerToken, password })).status, 200);
    cookies = "";
    assert.equal((await call("/auth/login", { email: "viewer@example.invalid", password })).status, 200);
    assert.equal((await call("/portal/session")).status, 200);
    assert.equal((await call("/portal/members")).status, 403);
    assert.equal((await call("/crm/communications")).status, 403);
    const { rows: [viewer] } = await pool.query("SELECT user_id FROM staff_credentials WHERE normalized_email='viewer@example.invalid'");
    await pool.query("UPDATE portal_memberships SET role='opportunity_manager' WHERE user_id=$1", [viewer.user_id]);
    const managerSession = await (await call("/portal/session")).json() as { member: { role: string }; permissions: string[] };
    assert.equal(managerSession.member.role, "opportunity_manager");
    assert(managerSession.permissions.includes("opportunities:write"));
    assert(!managerSession.permissions.includes("members:manage"));
    assert.equal((await call("/crm/communications")).status, 403);
    await pool.query("UPDATE portal_memberships SET active=false WHERE user_id=$1", [viewer.user_id]);
    assert.equal((await call("/portal/session")).status, 401);
    cookies = "";
    const unknown = await call("/auth/password-reset", { email: "unknown@example.invalid" });
    const known = await call("/auth/password-reset", { email: "admin@example.invalid" });
    assert.deepEqual(await unknown.json(), await known.json());
    assert.equal(unknown.status, known.status);
    const before = fixture.messages.length; await fixture.drain();
    assert.equal(fixture.messages.length, before + 1, "unknown and suspended accounts must not send recovery mail");
    const resetToken = token(fixture.messages.at(-1)!.text);
    assert.equal((await call("/auth/set-password", { token: resetToken, password: password + "new" })).status, 200);
    assert.equal((await call("/portal/session", undefined, { cookie: authenticatedCookies })).status, 401);
    cookies = "";
    assert.equal((await call("/auth/login", { email: "admin@example.invalid", password })).status, 401);
    assert.equal((await call("/auth/login", { email: "admin@example.invalid", password: password + "new" })).status, 200);
    const oldCookie = cookies;
    assert.equal((await call("/auth/logout", {})).status, 204);
    assert.equal((await call("/portal/session", undefined, { cookie: oldCookie })).status, 401);
    const { rows: [stored] } = await pool.query("SELECT password_hash FROM staff_credentials WHERE normalized_email='admin@example.invalid'");
    assert(!stored.password_hash.includes(password));
    assert.equal((await call("/readyz")).status, 503, "fixture provider settings are not launch readiness");
    const { inviteStaff, establishPassword, bootstrapStaff } = await import("./staff-accounts");
    const { processStaffMail } = await import("./staff-mail");
    const { EmailDeliveryError } = await import("./resend-errors");
    const actor = { userId: admin.user_id, displayName: "Fixture", email: "admin@example.invalid",
      role: "super_admin" as const, permissions: [] };
    await assert.rejects(() => bootstrapStaff("another@example.invalid"), /already set up/);
    const legacy = await inviteStaff("legacy-fixture-admin", actor);
    const retryAt = new Date(Date.now() + 3_600_000);
    let originalText = "", originalKey = "";
    await processStaffMail(async (message, key) => {
      originalText = message.text; originalKey = key;
      throw new EmailDeliveryError("daily_limit", retryAt);
    });
    const { rows: [deferred] } = await pool.query("SELECT * FROM staff_auth_mail WHERE id=$1", [legacy.id]);
    assert.equal(deferred.status, "deferred");
    assert(deferred.next_attempt_at >= retryAt);
    await pool.query("UPDATE staff_auth_mail SET next_attempt_at=now() WHERE id=$1", [legacy.id]);
    await processStaffMail(async (message, key) => {
      assert.equal(message.text, originalText);
      assert.equal(key, originalKey);
      return "fixture-provider-reference";
    });
    await establishPassword(token(originalText), password);
    const { rows: [preserved] } = await pool.query("SELECT user_id FROM staff_credentials WHERE normalized_email='legacy@example.invalid'");
    assert.equal(preserved.user_id, "legacy-fixture-admin", "existing identity IDs must survive credential setup");
    for (const id of ["uncertain", "old-retry"]) {
      await pool.query(`INSERT INTO portal_memberships(user_id,display_name,email,role,active)
        VALUES($1,'Mail fixture',$2,'viewer',true)`, [id, `${id}@example.invalid`]);
    }
    const uncertain = await inviteStaff("uncertain", actor);
    await processStaffMail(async () => { throw new EmailDeliveryError("unknown", undefined, true); });
    assert.equal((await pool.query("SELECT status FROM staff_auth_mail WHERE id=$1", [uncertain.id])).rows[0].status, "failed");
    const old = await inviteStaff("old-retry", actor);
    await pool.query(`UPDATE staff_auth_mail SET created_at=now()-interval '24 hours',attempts=1,
      status='deferred',sending_account=$2 WHERE id=$1`, [old.id, process.env.RESEND_ACCOUNT_ID]);
    let unsafeSends = 0;
    await processStaffMail(async () => { unsafeSends++; return "must-not-send"; });
    assert.equal(unsafeSends, 0, "uncertain and outside-window jobs must not be automatically resent");
    assert.equal((await pool.query("SELECT status FROM staff_auth_mail WHERE id=$1", [old.id])).rows[0].status, "failed");
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fixture.cleanup();
  }
});
