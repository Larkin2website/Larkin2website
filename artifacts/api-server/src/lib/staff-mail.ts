import { randomUUID } from "node:crypto";
import { pool, type PoolClient } from "@workspace/db";
import { digest, mailToken, randomToken, staffConfig, StaffAuthError } from "./staff-security";
import { emailAddress, sendResendEmail } from "./resend-transport";
import { EmailDeliveryError } from "./resend-errors";
import { logger } from "./logger";

export function staffMailConfig() {
  const cfg = staffConfig();
  try { return { ...cfg, from: emailAddress(process.env.STAFF_AUTH_FROM, "STAFF_AUTH_FROM", true) }; }
  catch { throw new StaffAuthError(503, "Staff email is not configured. Contact your administrator."); }
}
export async function queueStaffMail(client: PoolClient, kind: "invite" | "reset", email: string, targetId: string | null) {
  const cfg = staffMailConfig(), id = randomUUID(), nonce = randomToken();
  const tokenHash = digest(mailToken(id, nonce, cfg.secret));
  const expires = new Date(Date.now() + (kind === "invite" ? 48 * 60 * 60_000 : 30 * 60_000));
  const { rows: [row] } = await client.query(
    `INSERT INTO staff_auth_mail(id,kind,target_id,email,nonce,token_hash,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [id, kind, targetId, email, nonce, tokenHash, expires]);
  return row;
}
export function invitationResponse(row: any) {
  return { id: row.id, memberId: row.target_id, email: row.email,
    status: row.used_at ? "accepted" : row.revoked_at ? "revoked" : row.expires_at <= new Date() ? "expired" : "pending",
    deliveryStatus: row.status === "sending" ? "queued" : ["accepted", "deferred", "failed"].includes(row.status) ? row.status : "queued",
    expiresAt: row.expires_at.toISOString(), providerReference: row.provider_reference, lastError: row.last_error };
}
type StaffMailSender = (message: {from:string;to:string[];subject:string;text:string}, key: string) => Promise<string>;
export async function processStaffMail(send: StaffMailSender = (message, key) => sendResendEmail(message, key, undefined, "transactional")) {
  const cfg = staffMailConfig();
  for (let i = 0; i < 10; i++) {
    const { rows: [job] } = await pool.query(
      `UPDATE staff_auth_mail SET status='sending',lease_until=now()+interval '90 seconds',attempts=attempts+1,
       sending_account=COALESCE(sending_account,$1)
       WHERE id=(SELECT id FROM staff_auth_mail WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at>now()
         AND attempts<5 AND ((status IN ('queued','deferred') AND next_attempt_at<=now())
         OR (status='sending' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      [process.env.RESEND_ACCOUNT_ID ?? null]);
    if (!job) break;
    const finish = async (status: string, error: string | null, reference: string | null = null, delay = 60_000) => {
      await pool.query(`UPDATE staff_auth_mail SET status=$3,last_error=$4,provider_reference=$5,
        lease_until=NULL,next_attempt_at=$6 WHERE id=$1 AND attempts=$2 AND status='sending'`,
      [job.id, job.attempts, status, error, reference, new Date(Date.now() + delay)]);
    };
    try {
      if (job.attempts > 1 && (Date.now() - job.created_at.getTime() >= 23 * 60 * 60_000
        || job.sending_account !== (process.env.RESEND_ACCOUNT_ID ?? null))) {
        await finish("failed", "Retry window or provider account changed; administrator review required");
        continue;
      }
      let eligible: boolean;
      if (job.kind === "reset") {
        const { rows } = await pool.query(`SELECT 1 FROM staff_credentials c JOIN portal_memberships m ON m.user_id=c.user_id
          WHERE c.normalized_email=$1 AND m.active=true`, [job.email]);
        eligible = rows.length > 0;
      } else {
        const { rows } = await pool.query(`SELECT 1 FROM portal_access_grants WHERE id::text=$1 AND active=true AND claimed_user_id IS NULL
          UNION ALL SELECT 1 FROM portal_memberships WHERE user_id=$1 AND active=true`, [job.target_id]);
        eligible = rows.length > 0;
      }
      if (!eligible) {
        await pool.query("UPDATE staff_auth_mail SET revoked_at=now(),status='failed',last_error='Not deliverable',lease_until=NULL WHERE id=$1 AND attempts=$2", [job.id, job.attempts]);
        continue;
      }
      const token = mailToken(job.id, job.nonce, cfg.secret);
      // A signing-key rotation invalidates outstanding links. Never send a broken link.
      if (digest(token) !== job.token_hash) { await finish("failed", "Configuration changed; request a new link"); continue; }
      const link = `${cfg.origin}/larkin2-opportunities-portal/set-password#token=${token}`;
      const reference = await send({ from: cfg.from, to: [job.email],
        subject: job.kind === "invite" ? "Your HETV staff invitation" : "Reset your HETV staff password",
        text: `${job.kind === "invite" ? "You have been invited to the HETV staff workspace." : "A password reset was requested for your HETV staff account."}\n\nSet your password: ${link}\n\nThis single-use link expires at ${job.expires_at.toISOString()}. If you did not expect this email, ignore it.` },
      `staff-auth-${job.id}`);
      await finish("accepted", null, reference);
    } catch (e) {
      const error = e instanceof EmailDeliveryError ? e : undefined;
      const uncertain = !error || error.uncertain || error.code === "unknown";
      // Exact retries are safe only within Resend's idempotency window. Invites
      // live 48h but no sending attempt is retried after 23h.
      const tooOld = Date.now() - job.created_at.getTime() >= 23 * 60 * 60_000;
      await finish(uncertain || tooOld || job.attempts >= 5 ? "failed" : "deferred",
        uncertain ? "Acceptance uncertain; administrator review required" : error!.message, null,
        Math.max(60_000, (error?.retryAt?.getTime() ?? Date.now() + Math.min(1_800_000, 30_000 * 2 ** job.attempts)) - Date.now()));
    }
  }
}
export function startStaffMailWorker() {
  if (process.env.EMAIL_WORKERS_ENABLED !== "true") return async () => {};
  let running: Promise<void> | undefined;
  const tick = () => {
    if (running) return;
    running = (async () => {
      await pool.query(`DELETE FROM staff_sessions WHERE token_hash IN
        (SELECT token_hash FROM staff_sessions WHERE expires_at<now() OR last_seen_at<now()-interval '30 minutes' LIMIT 1000)`);
      await pool.query(`UPDATE staff_auth_mail SET status='failed',last_error='Link expired or delivery attempts exhausted',lease_until=NULL
        WHERE id IN (SELECT id FROM staff_auth_mail WHERE status IN ('queued','deferred','sending')
        AND (expires_at<=now() OR (status='sending' AND lease_until<now() AND attempts>=5)) LIMIT 1000)`);
      await pool.query(`DELETE FROM staff_auth_mail WHERE id IN
        (SELECT id FROM staff_auth_mail WHERE created_at<now()-interval '30 days' LIMIT 1000)`);
      if (process.env.RESEND_API_KEY && process.env.RESEND_ACCOUNT_ID) await processStaffMail();
    })().catch(() => { logger.warn("Staff email processing unavailable"); }).finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, 30_000); timer.unref(); tick();
  return async () => { clearInterval(timer); await running; };
}
