import { permissionsForRole } from "./permissions";
import type { PortalActor } from "./portal-auth";

const enabledValues = new Set(["1", "true", "yes", "on"]);
const disabledValues = new Set(["0", "false", "no", "off"]);

export const DEMO_PORTAL_USER_ID = "demo-super-admin";
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
    email: "demo@larkin2.invalid",
    role: "super_admin",
    permissions: permissionsForRole("super_admin"),
    demo: true,
  };
}

export function demoPortalMember() {
  const actor = demoPortalActor();
  return {
    userId: actor.userId,
    displayName: actor.displayName,
    email: actor.email,
    role: actor.role,
    active: true,
    createdAt: DEMO_PORTAL_STARTED_AT,
    updatedAt: DEMO_PORTAL_STARTED_AT,
  };
}