import { and, asc, count, desc, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";
import {
  auditEventsTable, db, opportunityContentItemsTable, opportunityDetailsTable,
  opportunitiesTable,
} from "@workspace/db";
import type { PortalActor } from "./portal-auth";
import {
  canTransitionStatus,
  type OpportunityStatus as Status,
} from "./opportunity-domain";
import { canonicalizeOpportunityOptions } from "./opportunity-option-service";
import { enqueuePublication, shouldEnqueueFirstPublication } from "./audience-crm-service";
import type { OpportunityInput } from "@workspace/api-zod";

type Input = Omit<OpportunityInput, "deadline"> & { deadline?: Date | null };
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

async function hydrate(rows: (typeof opportunitiesTable.$inferSelect)[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [content, details] = await Promise.all([
    db.select().from(opportunityContentItemsTable).where(inArray(opportunityContentItemsTable.opportunityId, ids))
      .orderBy(asc(opportunityContentItemsTable.section), asc(opportunityContentItemsTable.position)),
    db.select().from(opportunityDetailsTable).where(inArray(opportunityDetailsTable.opportunityId, ids))
      .orderBy(asc(opportunityDetailsTable.position)),
  ]);
  return rows.map((row) => ({
    ...row,
    contentItems: content.filter((x) => x.opportunityId === row.id).map(({ opportunityId: _, ...x }) => x),
    details: details.filter((x) => x.opportunityId === row.id).map(({ opportunityId: _, ...x }) => x),
  }));
}
export async function getOpportunity(id: string) {
  return (await hydrate(await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id))))[0];
}
async function audit(actor: PortalActor, action: string, opportunityId: string | null, beforeState?: unknown, afterState?: unknown) {
  await db.insert(auditEventsTable).values({
    action, opportunityId, actorUserId: actor.userId, actorName: actor.displayName,
    beforeState: beforeState ? snapshot(beforeState) : null, afterState: afterState ? snapshot(afterState) : null,
  });
}
export async function createOpportunity(input: Input, actor: PortalActor) {
  try {
    return await db.transaction(async (tx) => {
      const canonicalOptions = await canonicalizeOpportunityOptions(input, undefined, tx, true);
      const { contentItems, details: inputDetails, ...fields } = input;
      const [row] = await tx.insert(opportunitiesTable).values({ ...fields, ...canonicalOptions, status: "draft", createdBy: actor.userId, updatedBy: actor.userId }).returning();
      const content = contentItems.length ? await tx.insert(opportunityContentItemsTable).values(contentItems.map((x) => ({ ...x, opportunityId: row.id }))).returning() : [];
      const storedDetails = inputDetails.length ? await tx.insert(opportunityDetailsTable).values(inputDetails.map((x) => ({ ...x, opportunityId: row.id }))).returning() : [];
      const result = { ...row, contentItems: content.map(({ opportunityId: _, ...x }) => x), details: storedDetails.map(({ opportunityId: _, ...x }) => x) };
      await tx.insert(auditEventsTable).values({ action: "opportunity.created", opportunityId: row.id, actorUserId: actor.userId, actorName: actor.displayName, afterState: snapshot(result) });
      return result;
    });
  } catch (error: any) { if (error?.code === "23505") throw new Error("DUPLICATE"); throw error; }
}
export async function updateOpportunity(id: string, input: Input, actor: PortalActor) {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(opportunitiesTable)
        .where(eq(opportunitiesTable.id, id)).for("update");
      if (!current) return undefined;
      const [currentContent, currentDetails] = await Promise.all([
        tx.select().from(opportunityContentItemsTable)
          .where(eq(opportunityContentItemsTable.opportunityId, id))
          .orderBy(asc(opportunityContentItemsTable.section), asc(opportunityContentItemsTable.position)),
        tx.select().from(opportunityDetailsTable)
          .where(eq(opportunityDetailsTable.opportunityId, id))
          .orderBy(asc(opportunityDetailsTable.position)),
      ]);
      const before = {
        ...current,
        contentItems: currentContent.map(({ opportunityId: _, ...item }) => item),
        details: currentDetails.map(({ opportunityId: _, ...detail }) => detail),
      };
      const canonicalOptions = await canonicalizeOpportunityOptions(input, current, tx, true);
      const { contentItems, details: inputDetails, ...fields } = input;
      const [row] = await tx.update(opportunitiesTable).set({ ...fields, ...canonicalOptions, updatedBy: actor.userId }).where(eq(opportunitiesTable.id, id)).returning();
      await tx.delete(opportunityContentItemsTable).where(eq(opportunityContentItemsTable.opportunityId, id));
      await tx.delete(opportunityDetailsTable).where(eq(opportunityDetailsTable.opportunityId, id));
      const content = contentItems.length ? await tx.insert(opportunityContentItemsTable).values(contentItems.map((x) => ({ ...x, opportunityId: id }))).returning() : [];
      const storedDetails = inputDetails.length ? await tx.insert(opportunityDetailsTable).values(inputDetails.map((x) => ({ ...x, opportunityId: id }))).returning() : [];
      const result = { ...row, contentItems: content.map(({ opportunityId: _, ...x }) => x), details: storedDetails.map(({ opportunityId: _, ...x }) => x) };
      await tx.insert(auditEventsTable).values({ action: "opportunity.updated", opportunityId: id, actorUserId: actor.userId, actorName: actor.displayName, beforeState: snapshot(before), afterState: snapshot(result) });
      return result;
    });
  } catch (error: any) { if (error?.code === "23505") throw new Error("DUPLICATE"); throw error; }
}
export async function transitionOpportunity(id: string, status: Status, actor: PortalActor) {
  const found = await db.transaction(async (tx) => {
    const [before] = await tx.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).for("update");
    if (!before) return false;
    if (!canTransitionStatus(before.status as Status, status)) throw new Error("INVALID_TRANSITION");
    const now = new Date();
    const [row] = await tx.update(opportunitiesTable).set({
      status, updatedBy: actor.userId, publishedAt: status === "published" ? (before.publishedAt ?? now) : before.publishedAt,
      archivedAt: status === "archived" ? now : null,
    }).where(eq(opportunitiesTable.id, id)).returning();
    if (shouldEnqueueFirstPublication(before.publishedAt, status, !!actor.demo)) {
      await enqueuePublication(tx, "role", id, row.title);
    }
    await tx.insert(auditEventsTable).values({
      action: "opportunity.transitioned", opportunityId: id, actorUserId: actor.userId, actorName: actor.displayName,
      beforeState: snapshot(before), afterState: snapshot(row),
    });
    return true;
  });
  return found ? getOpportunity(id) : undefined;
}
export async function deleteOpportunity(id: string, actor: PortalActor) {
  const before = await getOpportunity(id); if (!before) return "NOT_FOUND";
  if (before.status !== "archived") return "NOT_ARCHIVED";
  await audit(actor, "opportunity.deleted", id, before);
  await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  return "DELETED";
}
export async function listOpportunities(query: { q?: string; status?: Status; page: number; pageSize: number; sort: string; order: string }) {
  const where = and(query.status ? eq(opportunitiesTable.status, query.status) : undefined,
    query.q ? or(ilike(opportunitiesTable.title, `%${query.q}%`), ilike(opportunitiesTable.department, `%${query.q}%`), ilike(opportunitiesTable.slug, `%${query.q}%`)) : undefined);
  const column = ({ updatedAt: opportunitiesTable.updatedAt, title: opportunitiesTable.title, department: opportunitiesTable.department, deadline: opportunitiesTable.deadline, status: opportunitiesTable.status } as Record<string, any>)[query.sort];
  const order = query.order === "asc" ? asc(column) : desc(column);
  const [[totals], rows] = await Promise.all([
    db.select({ total: count() }).from(opportunitiesTable).where(where),
    db.select().from(opportunitiesTable).where(where).orderBy(order).limit(query.pageSize).offset((query.page - 1) * query.pageSize),
  ]);
  return { items: await hydrate(rows), page: query.page, pageSize: query.pageSize, total: Number(totals.total), pageCount: Math.ceil(Number(totals.total) / query.pageSize) };
}
export async function listPublic(q?: string) {
  const where = and(inArray(opportunitiesTable.status, ["published", "closed", "filled"]), q ? or(ilike(opportunitiesTable.title, `%${q}%`), ilike(opportunitiesTable.department, `%${q}%`)) : undefined);
  return hydrate(await db.select().from(opportunitiesTable).where(where).orderBy(desc(opportunitiesTable.publishedAt)));
}
export async function dashboard() {
  const rows = await db.select().from(opportunitiesTable);
  const soon = new Date(); soon.setDate(soon.getDate() + 14);
  const counts = { total: rows.length, draft: 0, published: 0, closingSoon: 0, closed: 0, filled: 0, archived: 0 };
  for (const row of rows) { counts[row.status as Status]++; if (row.status === "published" && row.deadline && row.deadline >= new Date() && row.deadline <= soon) counts.closingSoon++; }
  const recent = await hydrate([...rows].sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5));
  const activity = await db.select().from(auditEventsTable).orderBy(desc(auditEventsTable.createdAt)).limit(5);
  return { counts, recentOpportunities: recent, recentActivity: activity };
}
export async function auditList(id: string) {
  return db.select().from(auditEventsTable).where(eq(auditEventsTable.opportunityId, id)).orderBy(desc(auditEventsTable.createdAt));
}