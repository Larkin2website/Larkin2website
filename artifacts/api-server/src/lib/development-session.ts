import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { CreatePortalDemoSessionBody as DevelopmentCredentials } from "@workspace/api-zod";
import { and, eq, lte } from "drizzle-orm";
import { db, temporaryTestSessionsTable } from "@workspace/db";
import { externalClerk } from "./clerk-config";

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
  return !externalClerk(env) && env.NODE_ENV !== "production" && env.DEV_DEMO_LOGIN_ENABLED === "true";
}

export function isTemporaryTestLoginEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (externalClerk(env)) return false;
  return env.NODE_ENV === "production"
    ? env.PUBLIC_TEST_LOGIN_ENABLED === "true"
    : env.DEV_DEMO_LOGIN_ENABLED === "true";
}

export function sessionCookieOptions(
  scope: DevelopmentScope,
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: `/api/${scope}`,
    maxAge: lifetimeMs,
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hasDevelopmentSession(req: Request, scope: DevelopmentScope): Promise<boolean> {
  if (!isTemporaryTestLoginEnabled()) return false;
  const token = req.cookies?.[cookies[scope]];
  if (typeof token !== "string") return false;
  const hash = tokenHash(token);
  if (process.env.NODE_ENV === "production") {
    const [session] = await db.select({ expiresAt: temporaryTestSessionsTable.expiresAt })
      .from(temporaryTestSessionsTable)
      .where(and(
        eq(temporaryTestSessionsTable.tokenHash, hash),
        eq(temporaryTestSessionsTable.scope, scope),
      )).limit(1);
    if (!session) return false;
    if (session.expiresAt.getTime() <= Date.now()) {
      await db.delete(temporaryTestSessionsTable)
        .where(eq(temporaryTestSessionsTable.tokenHash, hash));
      return false;
    }
    return true;
  }
  const session = sessions.get(hash);
  if (!session || session.scope !== scope) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(hash);
    return false;
  }
  return true;
}

export async function startDevelopmentSession(res: Response, scope: DevelopmentScope): Promise<void> {
  if (!isTemporaryTestLoginEnabled()) throw new Error("Temporary test sign-in is disabled");
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const expiresAt = new Date(now + lifetimeMs);
  if (process.env.NODE_ENV === "production") {
    await db.delete(temporaryTestSessionsTable)
      .where(lte(temporaryTestSessionsTable.expiresAt, new Date(now)));
    await db.insert(temporaryTestSessionsTable).values({ tokenHash: hash, scope, expiresAt });
  } else {
    for (const [key, session] of sessions) {
      if (session.expiresAt <= now) sessions.delete(key);
    }
    if (sessions.size >= maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest) sessions.delete(oldest);
    }
    sessions.set(hash, { scope, expiresAt: expiresAt.getTime() });
  }
  res.cookie(cookies[scope], token, sessionCookieOptions(scope));
}

export async function clearDevelopmentSession(req: Request, res: Response, scope: DevelopmentScope): Promise<void> {
  const token = req.cookies?.[cookies[scope]];
  if (typeof token === "string") {
    const hash = tokenHash(token);
    if (process.env.NODE_ENV === "production") {
      await db.delete(temporaryTestSessionsTable)
        .where(and(
          eq(temporaryTestSessionsTable.tokenHash, hash),
          eq(temporaryTestSessionsTable.scope, scope),
        ));
    } else {
      sessions.delete(hash);
    }
  }
  const { maxAge: _maxAge, ...clearOptions } = sessionCookieOptions(scope);
  res.clearCookie(cookies[scope], clearOptions);
}