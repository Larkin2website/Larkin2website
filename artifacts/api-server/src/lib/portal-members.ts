import {
  auditEventsTable,
  db,
  portalAccessGrantsTable,
  portalMembershipsTable,
  type PortalAccessGrant,
  type PortalMembership,
} from "@workspace/db";
import { count, eq, sql } from "drizzle-orm";
import type { PortalRole } from "./permissions";
import type { PortalActor } from "./portal-auth";

export type AccessGrantInput = {
  displayName: string;
  email: string;
  role: PortalRole;
};

export type PortalProfile = {
  displayName: string;
  email: string;
};

export type PortalMembershipStore = {
  findMembershipByUserId(userId: string): Promise<PortalMembership | undefined>;
  findMembershipByNormalizedEmail(normalizedEmail: string): Promise<PortalMembership | undefined>;
  findGrantByNormalizedEmail(normalizedEmail: string): Promise<PortalAccessGrant | undefined>;
  createMembership(values: Omit<PortalMembership, "createdAt" | "updatedAt">): Promise<PortalMembership>;
  claimGrant(id: string, userId: string): Promise<void>;
  countMemberships(): Promise<number>;
};

export type PortalPersonUpdate = {
  role: PortalRole;
  active: boolean;
};

export type PortalPersonUpdateStore = {
  findMembershipByUserId(userId: string): Promise<PortalMembership | undefined>;
  findGrantById(id: string): Promise<PortalAccessGrant | undefined>;
  countActiveSuperAdmins(): Promise<number>;
  updateMembership(userId: string, update: PortalPersonUpdate): Promise<PortalMembership>;
  updateGrant(id: string, update: PortalPersonUpdate): Promise<PortalAccessGrant>;
};

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPortalEmailConflict(error: unknown): boolean {
  let candidate: unknown = error;
  for (let depth = 0; depth < 5 && candidate && typeof candidate === "object"; depth += 1) {
    if ((candidate as { code?: unknown }).code === "23505") return true;
    candidate = (candidate as { cause?: unknown }).cause;
  }
  return false;
}

export function portalMemberResponse(member: PortalMembership) {
  return {
    id: member.userId,
    ...member,
    status: member.active ? "active" as const : "suspended" as const,
  };
}

export function portalGrantResponse(grant: PortalAccessGrant) {
  return {
    id: grant.id,
    userId: null,
    displayName: grant.displayName,
    email: grant.email,
    role: grant.role,
    active: grant.active,
    status: grant.active ? "pending" as const : "suspended" as const,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
  };
}

export async function resolvePortalMembership(
  userId: string,
  profile: PortalProfile,
  store: PortalMembershipStore,
): Promise<PortalMembership | undefined> {
  const existing = await store.findMembershipByUserId(userId);
  if (existing) return existing;

  const normalizedEmail = normalizePortalEmail(profile.email);
  const emailOwner = await store.findMembershipByNormalizedEmail(normalizedEmail);
  if (emailOwner && emailOwner.userId !== userId) return undefined;

  const grant = await store.findGrantByNormalizedEmail(normalizedEmail);
  if (grant) {
    const claimed = await store.createMembership({
      userId,
      displayName: grant.displayName,
      email: grant.email,
      role: grant.role,
      active: grant.active,
    });
    await store.claimGrant(grant.id, userId);
    return claimed;
  }

  // Never promote or enroll an uninvited first visitor. Staff identities are
  // established only by the single-use invitation acceptance transaction.
  return undefined;
}

export async function resolvePortalMembershipFromDatabase(
  userId: string,
  profile: PortalProfile,
): Promise<PortalMembership | undefined> {
  return withPortalIdentityTransaction(async (tx) => {
    const store: PortalMembershipStore = {
      async findMembershipByUserId(candidateUserId) {
        const [member] = await tx.select().from(portalMembershipsTable)
          .where(eq(portalMembershipsTable.userId, candidateUserId));
        return member;
      },
      async findMembershipByNormalizedEmail(normalizedEmail) {
        const [member] = await tx.select().from(portalMembershipsTable)
          .where(sql`lower(trim(${portalMembershipsTable.email})) = ${normalizedEmail}`);
        return member;
      },
      async findGrantByNormalizedEmail(normalizedEmail) {
        const [grant] = await tx.select().from(portalAccessGrantsTable)
          .where(eq(portalAccessGrantsTable.normalizedEmail, normalizedEmail));
        return grant;
      },
      async createMembership(values) {
        const [member] = await tx.insert(portalMembershipsTable).values(values).returning();
        return member;
      },
      async claimGrant(id, claimedUserId) {
        await tx.update(portalAccessGrantsTable)
          .set({ claimedUserId, claimedAt: new Date() })
          .where(eq(portalAccessGrantsTable.id, id));
      },
      async countMemberships() {
        const [{ total }] = await tx.select({ total: count() }).from(portalMembershipsTable);
        return Number(total);
      },
    };
    return resolvePortalMembership(userId, profile, store);
  });
}

export async function grantPortalAccess(input: AccessGrantInput, actor: PortalActor) {
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  const email = input.email.trim();
  const normalizedEmail = normalizePortalEmail(email);
  if (displayName.length < 2) throw new Error("INVALID_NAME");

  try {
    return await withPortalIdentityTransaction(async (tx) => {
      const [memberWithEmail] = await tx.select().from(portalMembershipsTable)
        .where(sql`lower(trim(${portalMembershipsTable.email})) = ${normalizedEmail}`);
      if (memberWithEmail) throw new Error("DUPLICATE_EMAIL");

      const [grant] = await tx.insert(portalAccessGrantsTable).values({
        displayName,
        email,
        normalizedEmail,
        role: input.role,
        active: true,
      }).returning();
      await tx.insert(auditEventsTable).values({
        action: "member.granted",
        actorUserId: actor.userId,
        actorName: actor.displayName,
        afterState: grant,
      });
      return portalGrantResponse(grant);
    });
  } catch (error) {
    if ((error as Error).message === "DUPLICATE_EMAIL" || isPortalEmailConflict(error)) {
      throw new Error("DUPLICATE_EMAIL");
    }
    throw error;
  }
}

type PortalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withPortalIdentityTransaction<T>(
  operation: (tx: PortalTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('larkin2:portal-bootstrap'))`);
    return operation(tx);
  });
}

export async function updatePortalPersonRecord(
  memberId: string,
  update: PortalPersonUpdate,
  store: PortalPersonUpdateStore,
) {
  const beforeMember = await store.findMembershipByUserId(memberId);
  const beforeGrant = beforeMember ? undefined : await store.findGrantById(memberId);
  const before = beforeMember ?? beforeGrant;
  if (!before) throw new Error("MEMBER_NOT_FOUND");
  if (beforeGrant?.claimedUserId) throw new Error("GRANT_ALREADY_CLAIMED");

  if (
    beforeMember &&
    beforeMember.role === "super_admin" &&
    beforeMember.active &&
    (update.role !== "super_admin" || !update.active) &&
    await store.countActiveSuperAdmins() <= 1
  ) {
    throw new Error("LAST_ACTIVE_ADMIN");
  }

  const person = beforeMember
    ? await store.updateMembership(memberId, update)
    : await store.updateGrant(beforeGrant!.id, update);
  return { before, person, kind: beforeMember ? "membership" as const : "grant" as const };
}

export async function updatePortalPerson(
  memberId: string,
  update: PortalPersonUpdate,
  actor: PortalActor,
) {
  return withPortalIdentityTransaction(async (tx) => {
    const result = await updatePortalPersonRecord(memberId, update, {
      async findMembershipByUserId(userId) {
        const [member] = await tx.select().from(portalMembershipsTable)
          .where(eq(portalMembershipsTable.userId, userId));
        return member;
      },
      async findGrantById(id) {
        const [grant] = await tx.select().from(portalAccessGrantsTable)
          .where(sql`${portalAccessGrantsTable.id}::text = ${id}`);
        return grant;
      },
      async countActiveSuperAdmins() {
        const [{ total }] = await tx.select({ total: count() }).from(portalMembershipsTable)
          .where(sql`${portalMembershipsTable.role} = 'super_admin' and ${portalMembershipsTable.active} = true`);
        return Number(total);
      },
      async updateMembership(userId, values) {
        if (values.active === false || (values.role !== undefined && values.role !== "super_admin")) {
          const current = await tx.execute(sql`select 1 from staff_credentials c join portal_memberships m on m.user_id=c.user_id
            where m.user_id=${userId} and m.active=true and m.role='super_admin'`);
          if (current.rows.length) {
            const others = await tx.execute(sql`select 1 from staff_credentials c join portal_memberships m on m.user_id=c.user_id
              where m.user_id<>${userId} and m.active=true and m.role='super_admin' limit 1`);
            if (!others.rows.length) throw new Error("LAST_ACTIVE_ADMIN");
          }
        }
        const [member] = await tx.update(portalMembershipsTable).set(values)
          .where(eq(portalMembershipsTable.userId, userId)).returning();
        await tx.execute(sql`delete from staff_sessions where user_id=${userId}`);
        return member;
      },
      async updateGrant(id, values) {
        const [grant] = await tx.update(portalAccessGrantsTable).set(values)
          .where(eq(portalAccessGrantsTable.id, id)).returning();
        return grant;
      },
    });
    await tx.insert(auditEventsTable).values({
      action: "member.updated",
      actorUserId: actor.userId,
      actorName: actor.displayName,
      beforeState: result.before,
      afterState: result.person,
    });
    return result.kind === "membership"
      ? portalMemberResponse(result.person as PortalMembership)
      : portalGrantResponse(result.person as PortalAccessGrant);
  });
}