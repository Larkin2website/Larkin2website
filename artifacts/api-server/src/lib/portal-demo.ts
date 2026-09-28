import { permissionsForRole } from "./permissions";
import type { PortalActor } from "./portal-auth";
import type { Request, Response } from "express";
import { clearDevelopmentSession, hasDevelopmentSession, isDevelopmentDemoEnabled, startDevelopmentSession } from "./development-session";

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
  return isDevelopmentDemoEnabled(env) && parseBoolean(env.PORTAL_DEMO_MODE, true);
}

export function validatePortalDemoMode(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === "production" && (
    parseBoolean(env.PORTAL_DEMO_MODE, false) ||
    parseBoolean(env.DEV_DEMO_LOGIN_ENABLED, false) ||
    parseBoolean(env.ALLOW_INSECURE_DEMO_DEPLOYMENT, false)
  )) {
    throw new Error(
      "Development demo sign-in cannot be enabled in production.",
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

export function hasDemoPortalSession(req: Request): boolean {
  return isPortalDemoMode() && hasDevelopmentSession(req, "portal");
}

export function startDemoPortalSession(res: Response): void {
  if (!isPortalDemoMode()) throw new Error("Portal demo sign-in is disabled");
  startDevelopmentSession(res, "portal");
}

export function clearDemoPortalSession(req: Request, res: Response): void {
  clearDevelopmentSession(req, res, "portal");
}