import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { auditEventsTable, db, programmeSectionsTable, programmesTable } from "@workspace/db";
import type { PortalActor } from "./portal-auth";
import { canProgrammeTransition, type ProgrammeStatus } from "./programme-lifecycle";

export type ProgrammeInput = {
  slug: string; num: string; cardTitle: string; cardCopy: string; cardCta: string; image: string;
  title: string; shortDescription: string; applicationStatus?: string; applicationDeadline?: string | null; deadline?: Date | null; location: string;
  applicationUrl?: string | null; featured: boolean; displayOrder: number;
  sections: { section: "about" | "placement" | "training" | "eligibility" | "timeline" | "application_guidance"; position: number; content: string }[];
};
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

export function programmeFieldsForWrite(input: ProgrammeInput) {
  const { sections: _, ...fields } = input;
  return fields;
}

async function hydrate(rows: (typeof programmesTable.$inferSelect)[]) {
  if (!rows.length) return [];
  const sections = await db.select().from(programmeSectionsTable)
    .where(inArray(programmeSectionsTable.programmeId, rows.map((r) => r.id)))
    .orderBy(asc(programmeSectionsTable.section), asc(programmeSectionsTable.position));
  return rows.map((row) => ({
    ...row,
    sections: sections.filter((s) => s.programmeId === row.id).map(({ programmeId: _, ...s }) => s),
  }));
}
async function audit(actor: PortalActor, action: string, programmeId: string, beforeState?: unknown, afterState?: unknown) {
  await db.insert(auditEventsTable).values({ action, programmeId, actorUserId: actor.userId, actorName: actor.displayName,
    beforeState: beforeState ? snapshot(beforeState) : null, afterState: afterState ? snapshot(afterState) : null });
}
export async function getProgramme(id: string) { return (await hydrate(await db.select().from(programmesTable).where(eq(programmesTable.id, id))))[0]; }
export async function getPublicProgramme(slug: string) {
  const [row] = await db.select().from(programmesTable).where(and(eq(programmesTable.slug, slug), inArray(programmesTable.status, ["published", "closed"])));
  return row ? (await hydrate([row]))[0] : undefined;
}
export async function listPublicProgrammes(q?: string) {
  const where = and(inArray(programmesTable.status, ["published", "closed"]),
    q ? or(ilike(programmesTable.title, `%${q}%`), ilike(programmesTable.shortDescription, `%${q}%`)) : undefined);
  return hydrate(await db.select().from(programmesTable).where(where).orderBy(asc(programmesTable.displayOrder), desc(programmesTable.publishedAt)));
}
export async function listProgrammes(query: { q?: string; status?: "draft" | "published" | "closed" | "archived"; page: number; pageSize: number; sort: "updatedAt" | "title" | "displayOrder" | "status"; order: "asc" | "desc" }) {
  const where = and(query.status ? eq(programmesTable.status, query.status) : undefined,
    query.q ? or(ilike(programmesTable.title, `%${query.q}%`), ilike(programmesTable.slug, `%${query.q}%`)) : undefined);
  const sortColumn = ({ updatedAt: programmesTable.updatedAt, title: programmesTable.title, displayOrder: programmesTable.displayOrder, status: programmesTable.status } as const)[query.sort];
  const [totals, rows] = await Promise.all([
    db.select({ total: count() }).from(programmesTable).where(where),
    db.select().from(programmesTable).where(where).orderBy(query.order === "asc" ? asc(sortColumn) : desc(sortColumn))
    .limit(query.pageSize).offset((query.page - 1) * query.pageSize),
  ]);
  return { items: await hydrate(rows), page: query.page, pageSize: query.pageSize, total: Number(totals[0].total), pageCount: Math.ceil(Number(totals[0].total) / query.pageSize) };
}
export async function createProgramme(input: ProgrammeInput, actor: PortalActor) {
  try {
    return await db.transaction(async (tx) => {
      const { sections } = input;
      const fields = programmeFieldsForWrite(input);
      const [row] = await tx.insert(programmesTable).values({ ...fields, applicationStatus: fields.applicationStatus ?? "Applications not yet open", status: "draft", createdBy: actor.userId, updatedBy: actor.userId }).returning();
      const stored = sections.length
        ? await tx.insert(programmeSectionsTable).values(sections.map((s) => ({ ...s, programmeId: row.id }))).returning()
        : [];
      const result = { ...row, sections: stored.map(({ programmeId: _, ...s }) => s) };
      await tx.insert(auditEventsTable).values({ action: "programme.created", programmeId: row.id, actorUserId: actor.userId, actorName: actor.displayName, afterState: snapshot(result) });
      return result;
    });
  } catch (error: any) { if (error?.code === "23505") throw new Error("DUPLICATE"); throw error; }
}
export async function updateProgramme(id: string, input: ProgrammeInput, actor: PortalActor) {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(programmesTable).where(eq(programmesTable.id, id)).for("update");
      if (!current) return undefined;
      const oldSections = await tx.select().from(programmeSectionsTable).where(eq(programmeSectionsTable.programmeId, id));
      const { sections } = input;
      const fields = programmeFieldsForWrite(input);
      const [row] = await tx.update(programmesTable).set({ ...fields, updatedBy: actor.userId }).where(eq(programmesTable.id, id)).returning();
      await tx.delete(programmeSectionsTable).where(eq(programmeSectionsTable.programmeId, id));
      const stored = sections.length
        ? await tx.insert(programmeSectionsTable).values(sections.map((s) => ({ ...s, programmeId: id }))).returning()
        : [];
      const before = { ...current, sections: oldSections }; const result = { ...row, sections: stored.map(({ programmeId: _, ...s }) => s) };
      await tx.insert(auditEventsTable).values({ action: "programme.updated", programmeId: id, actorUserId: actor.userId, actorName: actor.displayName, beforeState: snapshot(before), afterState: snapshot(result) });
      return result;
    });
  } catch (error: any) { if (error?.code === "23505") throw new Error("DUPLICATE"); throw error; }
}
export async function transitionProgramme(id: string, status: ProgrammeStatus, actor: PortalActor) {
  const before = await getProgramme(id); if (!before) return undefined;
  if (!canProgrammeTransition(before.status, status)) throw new Error("INVALID_TRANSITION");
  const now = new Date();
  const [row] = await db.update(programmesTable).set({ status, updatedBy: actor.userId, publishedAt: status === "published" ? (before.publishedAt ?? now) : before.publishedAt, archivedAt: status === "archived" ? now : null }).where(eq(programmesTable.id, id)).returning();
  const result = (await hydrate([row]))[0]; await audit(actor, "programme.transitioned", id, before, result); return result;
}
export async function deleteProgramme(id: string, actor: PortalActor) {
  const before = await getProgramme(id); if (!before) return "NOT_FOUND"; if (before.status !== "archived") return "NOT_ARCHIVED";
  await audit(actor, "programme.deleted", id, before); await db.delete(programmesTable).where(eq(programmesTable.id, id)); return "DELETED";
}
export async function programmeAuditList(id: string) { return db.select().from(auditEventsTable).where(eq(auditEventsTable.programmeId, id)).orderBy(desc(auditEventsTable.createdAt)); }