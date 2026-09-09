import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  auditEventsTable,
  db,
  opportunityOptionsTable,
} from "@workspace/db";
import type { PortalActor } from "./portal-auth";

export type OpportunityOptionKind = "department" | "role_type";

export function normalizeOptionLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

export function cleanOptionLabel(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 100) throw new Error("INVALID_OPTION");
  return cleaned;
}

export async function listOpportunityOptions(includeRetired = false) {
  const rows = await db
    .select()
    .from(opportunityOptionsTable)
    .where(includeRetired
      ? inArray(opportunityOptionsTable.kind, ["department", "role_type"])
      : and(inArray(opportunityOptionsTable.kind, ["department", "role_type"]), eq(opportunityOptionsTable.active, true)))
    .orderBy(asc(opportunityOptionsTable.kind), asc(opportunityOptionsTable.label));

  return {
    departments: rows.filter((row) => row.kind === "department"),
    roleTypes: rows.filter((row) => row.kind === "role_type"),
  };
}

type OptionClient = Pick<typeof db, "select">;

export async function findOpportunityOption(
  kind: OpportunityOptionKind,
  label: string,
  client: OptionClient = db,
  lock = false,
) {
  const normalizedLabel = normalizeOptionLabel(label);
  const query = client
    .select()
    .from(opportunityOptionsTable)
    .where(sql`${opportunityOptionsTable.kind} = ${kind} and ${opportunityOptionsTable.normalizedLabel} = ${normalizedLabel}`);
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

type OptionForSelection = {
  label: string;
  active: boolean;
} | undefined;

export function resolveOptionLabel(option: OptionForSelection, submittedLabel: string, currentLabel?: string) {
  if (submittedLabel === currentLabel) return currentLabel;
  return option?.active ? option.label : undefined;
}

export async function canonicalizeOpportunityOptions(input: {
  department: string;
  roleType: string;
}, current?: { department: string; roleType: string }, client: OptionClient = db, lock = false) {
  // Keep lock acquisition deterministic so concurrent opportunity writes cannot
  // deadlock while validating the same department and role type.
  const department = await findOpportunityOption("department", input.department, client, lock);
  const roleType = await findOpportunityOption("role_type", input.roleType, client, lock);
  const canonicalDepartment = resolveOptionLabel(department, input.department, current?.department);
  const canonicalRoleType = resolveOptionLabel(roleType, input.roleType, current?.roleType);
  if (!canonicalDepartment || !canonicalRoleType) throw new Error("UNKNOWN_OPTION");
  return { department: canonicalDepartment, roleType: canonicalRoleType };
}

export async function createOpportunityOption(
  kind: OpportunityOptionKind,
  label: string,
  actor: PortalActor,
) {
  const cleanedLabel = cleanOptionLabel(label);
  const normalizedLabel = normalizeOptionLabel(cleanedLabel);
  const existing = await findOpportunityOption(kind, cleanedLabel);
  if (existing) throw new Error("DUPLICATE_OPTION");

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(opportunityOptionsTable)
        .values({ kind, label: cleanedLabel, normalizedLabel, createdBy: actor.userId })
        .returning();
      await tx.insert(auditEventsTable).values({
        action: "opportunity_option.created",
        actorUserId: actor.userId,
        actorName: actor.displayName,
        afterState: { id: created.id, kind: created.kind, label: created.label },
      });
      return created;
    });
  } catch (error: any) {
    if (error?.code === "23505") throw new Error("DUPLICATE_OPTION");
    throw error;
  }
}

export async function renameOpportunityOption(id: string, label: string, actor: PortalActor) {
  const cleanedLabel = cleanOptionLabel(label);
  const normalizedLabel = normalizeOptionLabel(cleanedLabel);
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(opportunityOptionsTable)
        .where(eq(opportunityOptionsTable.id, id)).for("update");
      if (!before) throw new Error("OPTION_NOT_FOUND");
      if (!before.active) throw new Error("OPTION_RETIRED");
      const [updated] = await tx.update(opportunityOptionsTable)
        .set({ label: cleanedLabel, normalizedLabel })
        .where(and(eq(opportunityOptionsTable.id, id), eq(opportunityOptionsTable.active, true)))
        .returning();
      if (!updated) throw new Error("OPTION_RETIRED");
      await tx.insert(auditEventsTable).values({
        action: "opportunity_option.renamed", actorUserId: actor.userId, actorName: actor.displayName,
        beforeState: { id: before.id, kind: before.kind, label: before.label, active: before.active },
        afterState: { id: updated.id, kind: updated.kind, label: updated.label, active: updated.active },
      });
      return updated;
    });
  } catch (error: any) {
    if (error?.code === "23505") throw new Error("DUPLICATE_OPTION");
    throw error;
  }
}

export async function retireOpportunityOption(id: string, actor: PortalActor) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(opportunityOptionsTable)
      .where(eq(opportunityOptionsTable.id, id)).for("update");
    if (!before) throw new Error("OPTION_NOT_FOUND");
    const [updated] = await tx.update(opportunityOptionsTable)
      .set({ active: false, retiredAt: new Date(), retiredBy: actor.userId })
      .where(and(eq(opportunityOptionsTable.id, id), eq(opportunityOptionsTable.active, true)))
      .returning();
    if (!updated) throw new Error("OPTION_RETIRED");
    await tx.insert(auditEventsTable).values({
      action: "opportunity_option.retired", actorUserId: actor.userId, actorName: actor.displayName,
      beforeState: { id: before.id, kind: before.kind, label: before.label, active: before.active },
      afterState: { id: updated.id, kind: updated.kind, label: updated.label, active: updated.active },
    });
    return updated;
  });
}

export function validateMergeOptions(
  source: { id: string; kind: OpportunityOptionKind; active: boolean } | undefined,
  target: { id: string; kind: OpportunityOptionKind; active: boolean } | undefined,
) {
  return Boolean(source && target && source.id !== target.id && source.kind === target.kind && source.active && target.active);
}

export async function mergeOpportunityOption(id: string, targetId: string, actor: PortalActor) {
  if (id === targetId) throw new Error("INVALID_MERGE");
  return db.transaction(async (tx) => {
    const locked = await tx.select().from(opportunityOptionsTable)
      .where(inArray(opportunityOptionsTable.id, [id, targetId]))
      .orderBy(asc(opportunityOptionsTable.id))
      .for("update");
    const source = locked.find((option) => option.id === id);
    const target = locked.find((option) => option.id === targetId);
    if (!source || !target) throw new Error("OPTION_NOT_FOUND");
    if (!validateMergeOptions(source, target)) throw new Error("INVALID_MERGE");
    const [retired] = await tx.update(opportunityOptionsTable)
      .set({ active: false, retiredAt: new Date(), retiredBy: actor.userId })
      .where(and(eq(opportunityOptionsTable.id, id), eq(opportunityOptionsTable.active, true)))
      .returning();
    if (!retired) throw new Error("INVALID_MERGE");
    await tx.insert(auditEventsTable).values({
      action: "opportunity_option.merged", actorUserId: actor.userId, actorName: actor.displayName,
      beforeState: { source: { id: source.id, kind: source.kind, label: source.label, active: source.active } },
      afterState: {
        source: { id: retired.id, kind: retired.kind, label: retired.label, active: retired.active },
        target: { id: target.id, kind: target.kind, label: target.label, active: target.active },
        opportunityLabelsPreserved: true,
      },
    });
    return retired;
  });
}