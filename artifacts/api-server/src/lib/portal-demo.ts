import { permissionsForRole } from "./permissions";
import type { PortalActor } from "./portal-auth";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const enabledValues = new Set(["1", "true", "yes", "on"]);
const disabledValues = new Set(["0", "false", "no", "off"]);

export const DEMO_PORTAL_USER_ID = "demo-super-admin";
export const DEMO_PORTAL_MEMBER_ID = DEMO_PORTAL_USER_ID;
export const DEMO_PORTAL_EMAIL = "demo@larkin2.invalid";
export const DEMO_SESSION_COOKIE = "larkin2_demo_session";
export const DEMO_PORTAL_STARTED_AT = new Date("2026-01-01T00:00:00.000Z");

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (enabledValues.has(normalized)) return true;
  if (disabledValues.has(normalized)) return false;
  throw new Error(`Invalid boolean configuration value: "${value}"`);
}

export function isPortalDemoMode(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return parseBoolean(
    env.PORTAL_DEMO_MODE,
    env.NODE_ENV !== "production",
  );
}

export function validatePortalDemoMode(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (
    env.NODE_ENV === "production" &&
    isPortalDemoMode(env) &&
    !parseBoolean(env.ALLOW_INSECURE_DEMO_DEPLOYMENT, false)
  ) {
    throw new Error(
      "PORTAL_DEMO_MODE cannot run in production unless ALLOW_INSECURE_DEMO_DEPLOYMENT=true is explicitly set.",
    );
  }
}

export function demoPortalActor(): PortalActor {
  return {
    userId: DEMO_PORTAL_USER_ID,
    displayName: "Larkin2 Demo",
    email: DEMO_PORTAL_EMAIL,
    role: "super_admin",
    permissions: permissionsForRole("super_admin"),
    demo: true,
  };
}

export function demoPortalMember() {
  const actor = demoPortalActor();
  return {
    id: DEMO_PORTAL_MEMBER_ID,
    userId: actor.userId,
    displayName: actor.displayName,
    email: actor.email,
    role: actor.role,
    active: true,
    status: "active" as const,
    createdAt: DEMO_PORTAL_STARTED_AT,
    updatedAt: DEMO_PORTAL_STARTED_AT,
  };
}

function demoSessionSignature(secret: string): string {
  return createHmac("sha256", secret).update("larkin2:portal-demo:v1").digest("base64url");
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for portal demo sessions");
  return secret;
}

export function hasDemoPortalSession(req: Request, secret = sessionSecret()): boolean {
  const supplied = req.cookies?.[DEMO_SESSION_COOKIE];
  if (typeof supplied !== "string") return false;
  const expected = demoSessionSignature(secret);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function startDemoPortalSession(res: Response, secret = sessionSecret()): void {
  res.cookie(DEMO_SESSION_COOKIE, demoSessionSignature(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/portal",
  });
}

export function clearDemoPortalSession(res: Response): void {
  res.clearCookie(DEMO_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/portal",
  });
}