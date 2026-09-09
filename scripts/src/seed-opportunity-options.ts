import {
  db,
  DEFAULT_OPPORTUNITY_DEPARTMENTS,
  DEFAULT_OPPORTUNITY_ROLE_TYPES,
  opportunitiesTable,
  opportunityOptionsTable,
  pool,
} from "@workspace/db";

const normalizeOptionLabel = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");

export async function seedOpportunityOptions(): Promise<void> {
  const existingValues = await db
    .select({
      department: opportunitiesTable.department,
      roleType: opportunitiesTable.roleType,
    })
    .from(opportunitiesTable);

  const values = [
    ...DEFAULT_OPPORTUNITY_DEPARTMENTS.map((label) => ({
      kind: "department" as const,
      label,
    })),
    ...DEFAULT_OPPORTUNITY_ROLE_TYPES.map((label) => ({
      kind: "role_type" as const,
      label,
    })),
    ...existingValues.flatMap(({ department, roleType }) => [
      { kind: "department" as const, label: department },
      { kind: "role_type" as const, label: roleType },
    ]),
  ].map((option) => ({
    ...option,
    normalizedLabel: normalizeOptionLabel(option.label),
    createdBy: "system",
  }));

  await db.insert(opportunityOptionsTable).values(values).onConflictDoNothing();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedOpportunityOptions();
  await pool.end();
}