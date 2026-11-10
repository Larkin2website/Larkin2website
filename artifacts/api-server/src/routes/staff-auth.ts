import { Router, type RequestHandler } from "express";
import { LoginStaffBody, RequestStaffPasswordResetBody, SetStaffPasswordBody, CreateStaffInvitationBody } from "@workspace/api-zod";
import { checkStaffCredentials, establishPassword, inviteStaff, listInvitations, requestPasswordReset, resendInvitation, revokeInvitation } from "../lib/staff-accounts";
import { clearStaffCookies, createStaffSession, revokeStaffSession, setCsrfCookie } from "../lib/staff-session";
import { permissionsForRole } from "../lib/permissions";
import { StaffAuthError } from "../lib/staff-security";
import { requirePortal } from "../lib/portal-auth";
import { createFixedWindowRateLimit } from "../middlewares/fixed-window-rate-limit";

const router = Router();
const loginLimit = createFixedWindowRateLimit({ limit: 20, windowMs: 15 * 60_000 });
const recoveryLimit = createFixedWindowRateLimit({ limit: 5, windowMs: 15 * 60_000 });
const tokenLimit = createFixedWindowRateLimit({ limit: 20, windowMs: 15 * 60_000 });
const inviteLimit = createFixedWindowRateLimit({ limit: 30, windowMs: 15 * 60_000 });
const safe = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try { await fn(req, res, next); }
  catch (e) {
    const error = e instanceof StaffAuthError ? e : new StaffAuthError(503, "Staff access is temporarily unavailable. Please try again later.");
    req.log?.warn({ status: error.status }, "Staff authentication request declined");
    res.status(error.status).json({ error: error.message });
  }
};
router.get("/auth/session", safe(async (req, res) => {
  if (req.staffTokenHash) setCsrfCookie(res, req.staffTokenHash);
  res.json({ authenticated: Boolean(req.staffActor), user: req.staffActor ?? null });
}));
router.post("/auth/login", loginLimit, safe(async (req, res) => {
  const input = LoginStaffBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Enter a valid email address and password." }); return; }
  const user = await checkStaffCredentials(input.data.email, input.data.password);
  await createStaffSession(res, user.user_id, req.staffTokenHash, user.display_name);
  req.log?.info({ event: "staff.login" }, "Staff sign-in completed");
  res.json({ authenticated: true, user: { userId: user.user_id, displayName: user.display_name,
    email: user.email, role: user.role, permissions: permissionsForRole(user.role) } });
}));
router.post("/auth/logout", safe(async (req, res) => {
  if (req.staffTokenHash && req.staffActor) await revokeStaffSession(req.staffTokenHash, req.staffActor);
  clearStaffCookies(res); res.status(204).send();
}));
router.post("/auth/password-reset", recoveryLimit, safe(async (req, res) => {
  const input = RequestStaffPasswordResetBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Enter a valid email address." }); return; }
  try { await requestPasswordReset(input.data.email); }
  catch { req.log?.warn("Staff recovery queue unavailable"); }
  res.json({ message: "If an eligible account exists and email delivery is available, a password reset link will be sent." });
}));
router.post("/auth/set-password", tokenLimit, safe(async (req, res) => {
  const input = SetStaffPasswordBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Use the link from your email and a password between 12 and 128 characters." }); return; }
  await establishPassword(input.data.token, input.data.password);
  clearStaffCookies(res);
  res.json({ message: "Your password has been set. Sign in to continue." });
}));
router.get("/auth/invitations", requirePortal("members:manage"), safe(async (_req, res) => { res.json(await listInvitations()); }));
router.post("/auth/invitations", requirePortal("members:manage"), inviteLimit, safe(async (req, res) => {
  const input = CreateStaffInvitationBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Select an existing person in access management." }); return; }
  res.status(201).json(await inviteStaff(input.data.memberId, req.portalActor!));
}));
router.post("/auth/invitations/:id/resend", requirePortal("members:manage"), inviteLimit, safe(async (req, res) => {
  const id = String(req.params.id);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) { res.status(400).json({ error: "Invalid invitation." }); return; }
  res.status(201).json(await resendInvitation(id, req.portalActor!));
}));
router.delete("/auth/invitations/:id", requirePortal("members:manage"), safe(async (req, res) => {
  const id = String(req.params.id);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) { res.status(400).json({ error: "Invalid invitation." }); return; }
  await revokeInvitation(id, req.portalActor!); res.status(204).send();
}));
export default router;
