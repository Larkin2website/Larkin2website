import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  db,
  DEFAULT_OPPORTUNITY_DEPARTMENTS,
  DEFAULT_OPPORTUNITY_ROLE_TYPES,
  opportunitiesTable,
  opportunityOptionsTable,
  pool,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { seedOpportunityOptions } from "./seed-opportunity-options";

const normalizeOptionLabel = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");

const fixtureId = `${process.pid}-${Date.now()}`;
const fixtureSlugs = [
  `seed-options-history-a-${fixtureId}`,
  `seed-options-history-b-${fixtureId}`,
];
const legacyDepartment = `Legacy   Department ${fixtureId}`;
const duplicateLegacyDepartment = `  legacy department ${fixtureId}  `;
const legacyRoleType = `Legacy Role ${fixtureId}`;

after(async () => {
  await db
    .delete(opportunityOptionsTable)
    .where(
      and(
        inArray(opportunityOptionsTable.kind, ["department", "role_type"]),
        inArray(opportunityOptionsTable.normalizedLabel, [
          normalizeOptionLabel(legacyDepartment),
          normalizeOptionLabel(legacyRoleType),
        ]),
      ),
    );
  await db.delete(opportunitiesTable).where(inArray(opportunitiesTable.slug, fixtureSlugs));
  await pool.end();
});

test("seeds defaults and historical labels idempotently", async () => {
  await db.insert(opportunitiesTable).values([
    {
      slug: fixtureSlugs[0],
      title: "Historical opportunity A",
      publicationLabel: "Historical opportunity A",
      department: legacyDepartment,
      roleType: legacyRoleType,
      summary: "Seed regression fixture",
      applicationDeadline: "Open",
      createdBy: "seed-regression-test",
      updatedBy: "seed-regression-test",
    },
    {
      slug: fixtureSlugs[1],
      title: "Historical opportunity B",
      publicationLabel: "Historical opportunity B",
      department: duplicateLegacyDepartment,
      roleType: legacyRoleType,
      summary: "Seed regression fixture",
      applicationDeadline: "Open",
      createdBy: "seed-regression-test",
      updatedBy: "seed-regression-test",
    },
  ]);

  await seedOpportunityOptions();
  await seedOpportunityOptions();

  const expectedKeys = [
    ...DEFAULT_OPPORTUNITY_DEPARTMENTS.map(
      (label) => `department:${normalizeOptionLabel(label)}`,
    ),
    ...DEFAULT_OPPORTUNITY_ROLE_TYPES.map(
      (label) => `role_type:${normalizeOptionLabel(label)}`,
    ),
    `department:${normalizeOptionLabel(legacyDepartment)}`,
    `role_type:${normalizeOptionLabel(legacyRoleType)}`,
  ];
  const rows = await db
    .select({
      kind: opportunityOptionsTable.kind,
      label: opportunityOptionsTable.label,
      normalizedLabel: opportunityOptionsTable.normalizedLabel,
    })
    .from(opportunityOptionsTable)
    .where(
      inArray(
        opportunityOptionsTable.normalizedLabel,
        expectedKeys.map((key) => key.slice(key.indexOf(":") + 1)),
      ),
    );

  const rowsByKey = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.kind}:${row.normalizedLabel}`;
    rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row]);
  }

  for (const key of expectedKeys) {
    assert.equal(rowsByKey.get(key)?.length, 1, `${key} should exist exactly once`);
  }
  assert.equal(
    rowsByKey.get(`department:${normalizeOptionLabel(legacyDepartment)}`)?.[0]?.label,
    legacyDepartment,
    "the original historical department label should be preserved",
  );
  assert.equal(
    rowsByKey.get(`role_type:${normalizeOptionLabel(legacyRoleType)}`)?.[0]?.label,
    legacyRoleType,
    "the original historical role label should be preserved",
  );
});