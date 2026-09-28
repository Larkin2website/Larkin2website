import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { CreatePortalDemoSessionBody as DevelopmentCredentials } from "@workspace/api-zod";

export { DevelopmentCredentials };

export type DevelopmentScope = "portal" | "crm";
const cookies: Record<DevelopmentScope, string> = {
  portal: "larkin2_demo_session",
  crm: "hetv_crm_demo_session",
};
const sessions = new Map<string, { scope: DevelopmentScope; expiresAt: number }>();
const lifetimeMs = 8 * 60 * 60 * 1000;
const maxSessions = 2_000;

export function isDevelopmentDemoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.DEV_DEMO_LOGIN_ENABLED === "true";
}

export function hasDevelopmentSession(req: Request, scope: DevelopmentScope): boolean {
  if (!isDevelopmentDemoEnabled()) return false;
  const token = req.cookies?.[cookies[scope]];
  if (typeof token !== "string") return false;
  const session = sessions.get(token);
  if (!session || session.scope !== scope) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function startDevelopmentSession(res: Response, scope: DevelopmentScope): void {
  if (!isDevelopmentDemoEnabled()) throw new Error("Development sign-in is disabled");
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
  if (sessions.size >= maxSessions) {
    const oldest = sessions.keys().next().value;
    if (oldest) sessions.delete(oldest);
  }
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { scope, expiresAt: now + lifetimeMs });
  res.cookie(cookies[scope], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: `/api/${scope}`,
    maxAge: lifetimeMs,
  });
}

export function clearDevelopmentSession(req: Request, res: Response, scope: DevelopmentScope): void {
  const token = req.cookies?.[cookies[scope]];
  if (typeof token === "string") sessions.delete(token);
  res.clearCookie(cookies[scope], {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: `/api/${scope}`,
  });
}