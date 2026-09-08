import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { count, eq, sql } from "drizzle-orm";
import { db, portalMembershipsTable } from "@workspace/db";
import { can, permissionsForRole, type Permission, type PortalRole } from "./permissions";

export type PortalActor = {
  userId: string; displayName: string; email: string; role: PortalRole;
  permissions: Permission[];
};

declare global {
  namespace Express { interface Request { portalActor?: PortalActor } }
}

async function profileFor(userId: string) {
  const user = await clerkClient.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? `${userId}@unknown.invalid`;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    || user.username || email;
  return { displayName, email };
}

export const requirePortal = (permission?: Permission): RequestHandler => async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let [member] = await db.select().from(portalMembershipsTable)
    .where(eq(portalMembershipsTable.userId, auth.userId));
  if (!member) {
    const profile = await profileFor(auth.userId);
    member = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('larkin2:portal-bootstrap'))`);
      const [existing] = await tx.select().from(portalMembershipsTable)
        .where(eq(portalMembershipsTable.userId, auth.userId));
      if (existing) return existing;
      const [{ total }] = await tx.select({ total: count() }).from(portalMembershipsTable);
      const bootstrap = Number(total) === 0;
      const [created] = await tx.insert(portalMembershipsTable).values({
        userId: auth.userId,
        ...profile,
        role: bootstrap ? "super_admin" : "viewer",
        active: bootstrap,
      }).returning();
      return created;
    });
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