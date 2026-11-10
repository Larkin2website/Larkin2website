import type { RequestHandler, Response } from "express";
import { pool } from "@workspace/db";
import { csrfFor, digest, randomToken, same, staffConfig, StaffAuthError } from "./staff-security";
import { permissionsForRole, type PortalRole } from "./permissions";
import type { PortalActor } from "./portal-auth";

export const staffCookie = "hetv_staff_session";
const csrfCookie = "hetv_staff_csrf";
const absoluteMs = 8 * 60 * 60_000;
const idleMs = 30 * 60_000;
declare global {
  namespace Express {
    interface Request { staffActor?: PortalActor; staffTokenHash?: string }
  }
}
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api" });
export function clearStaffCookies(res: Response) {
  res.clearCookie(staffCookie, cookieOptions());
  res.clearCookie(csrfCookie, { ...cookieOptions(), httpOnly: false, path: "/" });
}
export function setCsrfCookie(res: Response, hash: string) {
  res.cookie(csrfCookie, csrfFor(hash), { ...cookieOptions(), path: "/", httpOnly: false, maxAge: absoluteMs });
}
export async function createStaffSession(res: Response, userId: string, previousHash?: string, displayName = "Staff account") {
  staffConfig();
  const token = randomToken(), hash = digest(token);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (previousHash) await client.query("DELETE FROM staff_sessions WHERE token_hash=$1", [previousHash]);
    await client.query("INSERT INTO staff_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)", [hash, userId, new Date(Date.now() + absoluteMs)]);
    await client.query(`INSERT INTO portal_audit_events(action,actor_user_id,actor_name,after_state)
      VALUES('staff.signed_in',$1,$2,$3)`, [userId, displayName, JSON.stringify({ targetId: userId })]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  res.cookie(staffCookie, token, { ...cookieOptions(), maxAge: absoluteMs });
  setCsrfCookie(res, hash);
}
export async function revokeStaffSession(hash: string, actor: PortalActor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM staff_sessions WHERE token_hash=$1", [hash]);
    await client.query(`INSERT INTO portal_audit_events(action,actor_user_id,actor_name,after_state)
      VALUES('staff.signed_out',$1,$2,$3)`, [actor.userId, actor.displayName, JSON.stringify({ targetId: actor.userId })]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
export const loadStaffSession: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[staffCookie];
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) { next(); return; }
  try {
    staffConfig();
    const hash = digest(token);
    const { rows: [row] } = await pool.query(
      `SELECT s.expires_at,s.last_seen_at,m.user_id,m.display_name,m.email,m.role,m.active
       FROM staff_sessions s JOIN staff_credentials c ON c.user_id=s.user_id
       JOIN portal_memberships m ON m.user_id=c.user_id WHERE s.token_hash=$1`, [hash]);
    if (!row || !row.active || row.expires_at <= new Date() || row.last_seen_at.getTime() + idleMs <= Date.now()) {
      await pool.query("DELETE FROM staff_sessions WHERE token_hash=$1", [hash]);
      clearStaffCookies(res); next(); return;
    }
    req.staffActor = { userId: row.user_id, displayName: row.display_name, email: row.email,
      role: row.role as PortalRole, permissions: permissionsForRole(row.role) };
    req.staffTokenHash = hash;
    if (row.last_seen_at.getTime() < Date.now() - 60_000) {
      await pool.query("UPDATE staff_sessions SET last_seen_at=now() WHERE token_hash=$1", [hash]);
    }
    next();
  } catch { res.status(503).json({ error: "Staff access is temporarily unavailable. Please try again later." }); }
};
export const staffMutationProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)
    || !/^\/api\/(?:auth|portal|crm)(?:\/|$)/.test(req.path)) { next(); return; }
  // No-origin server tests of protected routers still cannot acquire an identity.
  if (!req.path.startsWith("/api/auth") && !req.staffActor) { next(); return; }
  try {
    const cfg = staffConfig();
    if (req.get("origin") !== cfg.origin || req.get("sec-fetch-site") === "cross-site") {
      throw new StaffAuthError(403, "Request origin is not permitted.");
    }
    if (req.staffTokenHash && !same(req.get("x-staff-csrf") ?? "", csrfFor(req.staffTokenHash))) {
      throw new StaffAuthError(403, "Refresh the page and try again.");
    }
    next();
  } catch (e) {
    const err = e instanceof StaffAuthError ? e : new StaffAuthError(503, "Staff access is unavailable.");
    res.status(err.status).json({ error: err.message });
  }
};
