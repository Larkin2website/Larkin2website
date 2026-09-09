import { asc, inArray, sql } from "drizzle-orm";
import {
  auditEventsTable,
  db,
  opportunitiesTable,
  opportunityOptionsTable,
} from "@workspace/db";
import type { PortalActor } from "./portal-auth";

export type OpportunityOptionKind = "department" | "role_type";

const DEFAULT_DEPARTMENTS = [
  "ACCESSIBILITY",
  "ACCOUNTS",
  "ART DEPARTMENT",
  "ASSISTANT DIRECTORS",
  "CAMERA",
  "CAST SUPPORT",
  "CATERING",
  "CLEARANCES",
  "CONTINUITY",
  "CONSTRUCTION",
  "COSTUME",
  "CRAFT",
  "DIT / VIDEO",
  "ELECTRICAL",
  "FACILITIES",
  "GRIP",
  "HAIR & MAKEUP",
  "HEALTH & SAFETY",
  "LOCATIONS",
  "POST PRODUCTION",
  "PROPS",
  "PUBLICITY",
  "PRODUCTION",
  "SET DECORATION",
  "SFX",
  "SOUND",
  "STANDBYS",
  "STUDIO UNIT",
  "STUNT",
  "SUSTAINABILITY",
  "TRANSPORT",
  "TRAINING & DEVELOPMENT",
  "VFX",
] as const;

const DEFAULT_ROLE_TYPES = [
  "freelance",
  "full time",
  "internship",
  "part time",
  "temporary",
] as const;

export function normalizeOptionLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

export function cleanOptionLabel(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 100) throw new Error("INVALID_OPTION");
  return cleaned;
}

async function ensureOptions() {
  const existingValues = await db
    .select({
      department: opportunitiesTable.department,
      roleType: opportunitiesTable.roleType,
    })
    .from(opportunitiesTable);

  const values = [
    ...DEFAULT_DEPARTMENTS.map((label) => ({ kind: "department" as const, label })),
    ...DEFAULT_ROLE_TYPES.map((label) => ({ kind: "role_type" as const, label })),
    ...existingValues.flatMap(({ department, roleType }) => [
      { kind: "department" as const, label: department },
      { kind: "role_type" as const, label: roleType },
    ]),
  ].map((option) => ({
    ...option,
    normalizedLabel: normalizeOptionLabel(option.label),
    createdBy: "system",
  }));

  if (values.length) {
    await db.insert(opportunityOptionsTable).values(values).onConflictDoNothing();
  }
}

export async function listOpportunityOptions() {
  await ensureOptions();
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
  await ensureOptions();
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
  await ensureOptions();
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