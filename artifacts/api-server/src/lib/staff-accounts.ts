import { randomUUID } from "node:crypto";
import { pool, type PoolClient } from "@workspace/db";
import { normalizePortalEmail } from "./portal-members";
import { digest, hashPassword, mailToken, staffConfig, StaffAuthError, verifyPassword } from "./staff-security";
import { invitationResponse, queueStaffMail, staffMailConfig } from "./staff-mail";
import type { PortalActor } from "./portal-auth";

export async function identityTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('larkin2:portal-bootstrap'))");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
export async function authAudit(client: PoolClient, action: string, actor: Pick<PortalActor, "userId" | "displayName">, targetId?: string) {
  await client.query(`INSERT INTO portal_audit_events(action,actor_user_id,actor_name,after_state)
    VALUES($1,$2,$3,$4)`, [action, actor.userId, actor.displayName, JSON.stringify({ targetId })]);
}
export async function checkStaffCredentials(email: string, password: string) {
  staffConfig();
  const { rows: [row] } = await pool.query(
    `SELECT c.password_hash,m.user_id,m.display_name,m.email,m.role,m.active
     FROM staff_credentials c JOIN portal_memberships m ON m.user_id=c.user_id WHERE c.normalized_email=$1`,
    [normalizePortalEmail(email)]);
  const valid = await verifyPassword(password, row?.password_hash);
  if (!valid || !row?.active) throw new StaffAuthError(401, "Email or password is incorrect.");
  const { password_hash: _hash, ...member } = row;
  return member;
}
export async function requestPasswordReset(email: string) {
  // Deliberately do not look up an account in the request path. Both unknown and
  // known emails produce the same queue operation; provider work happens later.
  staffMailConfig();
  await identityTransaction(async client => {
    const normalized = normalizePortalEmail(email);
    const { rows: [recent] } = await client.query(`SELECT count(*)::int AS count FROM staff_auth_mail
      WHERE email=$1 AND kind='reset' AND created_at>now()-interval '15 minutes'`, [normalized]);
    if (recent.count >= 3) return;
    await client.query("UPDATE staff_auth_mail SET revoked_at=now() WHERE email=$1 AND kind='reset' AND used_at IS NULL AND revoked_at IS NULL", [normalized]);
    await queueStaffMail(client, "reset", normalized, null);
  });
}
async function inviteTarget(client: PoolClient, targetId: string) {
  const { rows: members } = await client.query("SELECT user_id,email,display_name,role,active FROM portal_memberships WHERE user_id=$1 FOR UPDATE", [targetId]);
  if (members[0]) return { ...members[0], member: true };
  const { rows: grants } = await client.query("SELECT id,email,display_name,role,active,claimed_user_id FROM portal_access_grants WHERE id::text=$1 FOR UPDATE", [targetId]);
  return grants[0] ? { ...grants[0], member: false } : undefined;
}
async function queueInvite(client: PoolClient, targetId: string, actor: Pick<PortalActor, "userId" | "displayName">) {
  const target = await inviteTarget(client, targetId);
  if (!target || !target.active || target.claimed_user_id) throw new StaffAuthError(409, "This person cannot receive a new invitation. Refresh access management.");
  const email = normalizePortalEmail(target.email);
  const { rows } = await client.query("SELECT 1 FROM staff_credentials WHERE normalized_email=$1", [email]);
  if (rows.length) throw new StaffAuthError(409, "This account is already set up. Use password reset instead.");
  await client.query(`UPDATE staff_auth_mail SET revoked_at=now() WHERE kind='invite' AND email=$1 AND used_at IS NULL AND revoked_at IS NULL`, [email]);
  const row = await queueStaffMail(client, "invite", email, targetId);
  await authAudit(client, "staff.invitation.queued", actor, targetId);
  return invitationResponse(row);
}
export async function inviteStaff(targetId: string, actor: PortalActor) {
  staffMailConfig();
  return identityTransaction(client => queueInvite(client, targetId, actor));
}
export async function resendInvitation(id: string, actor: PortalActor) {
  staffMailConfig();
  return identityTransaction(async client => {
    const { rows: [old] } = await client.query("SELECT * FROM staff_auth_mail WHERE id=$1 AND kind='invite' FOR UPDATE", [id]);
    if (!old || old.used_at) throw new StaffAuthError(409, "This invitation cannot be resent.");
    return queueInvite(client, old.target_id, actor);
  });
}
export async function revokeInvitation(id: string, actor: PortalActor) {
  await identityTransaction(async client => {
    const { rows: [row] } = await client.query(
      "UPDATE staff_auth_mail SET revoked_at=now() WHERE id=$1 AND kind='invite' AND used_at IS NULL RETURNING target_id", [id]);
    if (!row) throw new StaffAuthError(409, "This invitation cannot be revoked. Suspend an accepted account through access management.");
    await authAudit(client, "staff.invitation.revoked", actor, row.target_id);
  });
}
export async function listInvitations() {
  const { rows } = await pool.query(`SELECT j.*,COALESCE(g.claimed_user_id,j.target_id) AS target_id
    FROM staff_auth_mail j LEFT JOIN portal_access_grants g ON g.id::text=j.target_id
    WHERE j.kind='invite' ORDER BY j.created_at DESC LIMIT 500`);
  return rows.map(invitationResponse);
}
export async function establishPassword(token: string, password: string) {
  const cfg = staffConfig();
  const passwordHash = await hashPassword(password);
  return identityTransaction(async client => {
    const invalid = () => new StaffAuthError(400, "This link is invalid or expired. Request a new link from your administrator or the password reset page.");
    const { rows: [job] } = await client.query(
      "SELECT * FROM staff_auth_mail WHERE token_hash=$1 FOR UPDATE", [digest(token)]);
    if (!job || job.used_at || job.revoked_at || job.expires_at <= new Date()
      || digest(mailToken(job.id, job.nonce, cfg.secret)) !== job.token_hash) throw invalid();
    let userId: string;
    if (job.kind === "reset") {
      const { rows: [account] } = await client.query(`SELECT c.user_id FROM staff_credentials c
        JOIN portal_memberships m ON m.user_id=c.user_id WHERE c.normalized_email=$1 AND m.active=true FOR UPDATE`, [job.email]);
      if (!account) throw invalid();
      userId = account.user_id;
      await client.query("UPDATE staff_credentials SET password_hash=$2,updated_at=now() WHERE user_id=$1", [userId, passwordHash]);
    } else if (job.kind === "invite") {
      const target = await inviteTarget(client, job.target_id);
      if (!target || !target.active || target.claimed_user_id || normalizePortalEmail(target.email) !== job.email) throw invalid();
      const { rows: existing } = await client.query("SELECT 1 FROM staff_credentials WHERE normalized_email=$1", [job.email]);
      if (existing.length) throw invalid();
      const { rows: owners } = await client.query("SELECT user_id FROM portal_memberships WHERE lower(trim(email))=$1", [job.email]);
      // Never choose between ambiguous historical identity records.
      if (owners.length > (target.member ? 1 : 0)) throw invalid();
      userId = target.member ? target.user_id : `staff_${randomUUID()}`;
      if (!target.member) {
        await client.query(`INSERT INTO portal_memberships(user_id,display_name,email,role,active)
          VALUES($1,$2,$3,$4,true)`, [userId, target.display_name, target.email, target.role]);
        await client.query("UPDATE portal_access_grants SET claimed_user_id=$2,claimed_at=now() WHERE id=$1", [target.id, userId]);
      }
      await client.query(`INSERT INTO staff_credentials(user_id,normalized_email,password_hash,verified_at)
        VALUES($1,$2,$3,now())`, [userId, job.email, passwordHash]);
    } else throw invalid();
    await client.query("DELETE FROM staff_sessions WHERE user_id=$1", [userId]);
    await client.query("UPDATE staff_auth_mail SET used_at=now() WHERE id=$1", [job.id]);
    await client.query("UPDATE staff_auth_mail SET revoked_at=now() WHERE email=$1 AND id<>$2 AND used_at IS NULL AND revoked_at IS NULL", [job.email, job.id]);
    await authAudit(client, job.kind === "invite" ? "staff.invitation.accepted" : "staff.password.reset",
      { userId, displayName: "Staff account" }, userId);
  });
}
export async function bootstrapStaff(email: string, displayName = "Staff administrator") {
  staffMailConfig();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new StaffAuthError(400, "FIRST_ADMIN_EMAIL must be explicitly configured.");
  return identityTransaction(async client => {
    const { rows } = await client.query(`SELECT 1 FROM staff_credentials c JOIN portal_memberships m ON m.user_id=c.user_id
      WHERE m.active=true AND m.role='super_admin' LIMIT 1`);
    if (rows.length) throw new StaffAuthError(409, "A staff administrator is already set up. Use administrator invitations.");
    const normalized = normalizePortalEmail(email);
    const { rows: existing } = await client.query("SELECT * FROM portal_memberships WHERE lower(trim(email))=$1", [normalized]);
    if (existing.length > 1) throw new StaffAuthError(409, "Reconcile duplicate membership emails before setup.");
    let targetId: string;
    if (existing[0]) {
      if (!existing[0].active || existing[0].role !== "super_admin") throw new StaffAuthError(409, "Existing membership must already be an approved active super-admin.");
      targetId = existing[0].user_id;
    } else {
      const { rows: [grant] } = await client.query(`INSERT INTO portal_access_grants(display_name,email,normalized_email,role,active)
        VALUES($1,$2,$2,'super_admin',true) ON CONFLICT(normalized_email) DO UPDATE SET role='super_admin',active=true
        WHERE portal_access_grants.claimed_user_id IS NULL RETURNING id`, [displayName, normalized]);
      if (!grant) throw new StaffAuthError(409, "This email already has a claimed grant; reconcile identity first.");
      targetId = grant.id;
    }
    return queueInvite(client, targetId, { userId: "operator-bootstrap", displayName: "Authorized operator" });
  });
}
