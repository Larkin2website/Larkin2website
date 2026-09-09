import { asc, inArray, sql } from "drizzle-orm";
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

export async function listOpportunityOptions() {
  const rows = await db
    .select()
    .from(opportunityOptionsTable)
    .where(inArray(opportunityOptionsTable.kind, ["department", "role_type"]))
    .orderBy(asc(opportunityOptionsTable.kind), asc(opportunityOptionsTable.label));

  return {
    departments: rows.filter((row) => row.kind === "department"),
    roleTypes: rows.filter((row) => row.kind === "role_type"),
  };
}

export async function findOpportunityOption(kind: OpportunityOptionKind, label: string) {
  const normalizedLabel = normalizeOptionLabel(label);
  const [row] = await db
    .select()
    .from(opportunityOptionsTable)
    .where(sql`${opportunityOptionsTable.kind} = ${kind} and ${opportunityOptionsTable.normalizedLabel} = ${normalizedLabel}`);
  return row;
}

export async function canonicalizeOpportunityOptions(input: {
  department: string;
  roleType: string;
}) {
  const [department, roleType] = await Promise.all([
    findOpportunityOption("department", input.department),
    findOpportunityOption("role_type", input.roleType),
  ]);
  if (!department || !roleType) throw new Error("UNKNOWN_OPTION");
  return { department: department.label, roleType: roleType.label };
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