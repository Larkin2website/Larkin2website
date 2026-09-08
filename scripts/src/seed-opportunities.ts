import { db, opportunityContentItemsTable, opportunityDetailsTable, opportunitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ROLES } from "../../artifacts/larkin2-opportunities/src/data/roles";

const statusFor = (status: "Open" | "Closed" | "Filled") =>
  status === "Closed" ? "closed" as const : status === "Filled" ? "filled" as const : "published" as const;

async function seed(): Promise<void> {
  for (const role of ROLES) {
    await db.transaction(async (tx) => {
      const status = statusFor(role.status);
      const [opportunity] = await tx.insert(opportunitiesTable).values({
        slug: role.id, title: role.title, status, publicationLabel: role.date,
        department: role.department, roleType: role.roleType, summary: role.summary,
        applicationDeadline: role.applicationDeadline, responseDate: role.responseDate ?? null,
        applicationUrl: null, deadline: null, deadlineExtended: role.deadlineExtended ?? false,
        featured: role.featured ?? false, urgent: role.urgent ?? false,
        publishedAt: status === "published" ? new Date(role.date) : null,
        createdBy: "seed", updatedBy: "seed",
      }).onConflictDoUpdate({
        target: opportunitiesTable.slug,
        set: {
          title: role.title, status, publicationLabel: role.date, department: role.department,
          roleType: role.roleType, summary: role.summary, applicationDeadline: role.applicationDeadline,
          responseDate: role.responseDate ?? null, applicationUrl: null,
          deadlineExtended: role.deadlineExtended ?? false, featured: role.featured ?? false,
          urgent: role.urgent ?? false, updatedBy: "seed", archivedAt: null,
        },
      }).returning();
      await tx.delete(opportunityContentItemsTable).where(eq(opportunityContentItemsTable.opportunityId, opportunity.id));
      await tx.delete(opportunityDetailsTable).where(eq(opportunityDetailsTable.opportunityId, opportunity.id));
      await tx.insert(opportunityContentItemsTable).values([
        ...role.responsibilities.map((content, position) => ({ opportunityId: opportunity.id, section: "responsibility" as const, position, content })),
        ...(role.essential ?? []).map((content, position) => ({ opportunityId: opportunity.id, section: "essential" as const, position, content })),
        ...(role.desired ?? []).map((content, position) => ({ opportunityId: opportunity.id, section: "desired" as const, position, content })),
      ]);
      await tx.insert(opportunityDetailsTable).values(role.details.map((detail, position) => ({
        opportunityId: opportunity.id, position, ...detail,
      })));
    });
  }
}
await seed();
await db.$client.end();