import type { Request, RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, portalMembershipsTable, type PortalMembership } from "@workspace/db";
import { can, permissionsForRole, type Permission, type PortalRole } from "./permissions";
import { demoPortalActor, hasDemoPortalSession, isPortalDemoMode } from "./portal-demo";
import { resolvePortalMembershipFromDatabase } from "./portal-members";
import type { PortalProfile } from "./portal-members";

export type PortalActor = {
  userId: string; displayName: string; email: string; role: PortalRole;
  permissions: Permission[];
  demo?: boolean;
};

declare global {
  namespace Express { interface Request { portalActor?: PortalActor } }
}

type ClerkPortalProfile = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: {
    emailAddress: string;
    verification?: { status?: string | null } | null;
  } | null;
};

export function verifiedPortalProfile(user: ClerkPortalProfile): PortalProfile | undefined {
  const primaryEmail = user.primaryEmailAddress;
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") return undefined;
  const email = primaryEmail.emailAddress;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    || user.username || email;
  return { displayName, email };
}

async function profileFor(userId: string) {
  return verifiedPortalProfile(await clerkClient.users.getUser(userId));
}

type PortalAuthDependencies = {
  demoMode?: () => boolean;
  userIdForRequest?: (req: Request) => string | undefined;
  hasDemoSession?: (req: Request) => boolean;
  profileForUser?: typeof profileFor;
  memberForUser?: (userId: string) => Promise<PortalMembership | undefined>;
  resolveUnrecognizedUser?: typeof resolvePortalMembershipFromDatabase;
};

export function createRequirePortal(
  dependencies: PortalAuthDependencies = {},
): (permission?: Permission) => RequestHandler {
  const demoMode = dependencies.demoMode ?? isPortalDemoMode;
  const userIdForRequest = dependencies.userIdForRequest ?? ((req) => getAuth(req).userId);
  const demoSession = dependencies.hasDemoSession ?? hasDemoPortalSession;
  const getProfile = dependencies.profileForUser ?? profileFor;
  const getMember = dependencies.memberForUser ?? (async (userId) => {
    const [member] = await db.select().from(portalMembershipsTable)
      .where(eq(portalMembershipsTable.userId, userId));
    return member;
  });
  const resolveUnrecognizedUser = dependencies.resolveUnrecognizedUser ?? resolvePortalMembershipFromDatabase;

  return (permission?: Permission): RequestHandler => async (req, res, next) => {
  if (demoMode()) {
    if (!demoSession(req)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const actor = demoPortalActor();
    if (permission && !can(actor.role, permission)) {
      res.status(403).json({ error: "Insufficient permission" });
      return;
    }
    req.portalActor = actor;
    next();
    return;
  }

  const userId = userIdForRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let member = await getMember(userId);
  if (!member) {
    const profile = await getProfile(userId);
    if (!profile) {
      res.status(403).json({ error: "A verified email address is required for portal access" });
      return;
    }
    member = await resolveUnrecognizedUser(userId, profile);
  }
  if (!member?.active) {
    res.status(403).json({ error: "Portal access has not been approved" });
    return;
  }
  const actor: PortalActor = {
    userId: member.userId, displayName: member.displayName, email: member.email,
    role: member.role, permissions: permissionsForRole(member.role),
  };
  if (permission && !can(actor.role, permission)) {
    res.status(403).json({ error: "Insufficient permission" });
    return;
  }
  req.portalActor = actor;
  next();
  };
};

export const requirePortal = createRequirePortal();

/** CRM data is restricted to a verified, active real super-admin membership. */
export const requireCrmAccess: RequestHandler = async (req, res, next) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const [member] = await db.select().from(portalMembershipsTable)
      .where(eq(portalMembershipsTable.userId, userId)).limit(1);
    if (!member?.active || member.role !== "super_admin") {
      res.status(403).json({ error: "CRM access requires an active super admin" });
      return;
    }
    const profile = verifiedPortalProfile(await clerkClient.users.getUser(userId));
    if (!profile) {
      res.status(403).json({ error: "A verified Clerk email address is required for CRM access" });
      return;
    }
    // This middleware authenticates from Clerk + the active membership table directly;
    // demo cookies and the portal demo actor are intentionally never considered.
    req.portalActor = {
      userId,
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      permissions: permissionsForRole(member.role),
    };
    next();
  } catch (error) {
    next(error);
  }
};