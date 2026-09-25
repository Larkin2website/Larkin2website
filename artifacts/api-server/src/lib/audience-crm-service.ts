import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  audienceMatchingTable,
  crmCommunicationOutboxTable,
  crmCommunicationsTable,
  crmEnquiriesTable,
  db,
  opportunityOptionsTable,
  opportunitiesTable,
  programmesTable,
  publicEngagementEventsTable,
  publicSubscriptionsTable,
} from "@workspace/db";

export type PublicationKind = "role" | "programme";
export type MatchingInput = {
  contentType: "role" | "programme" | "training";
  careerLevels: ("new_entrant" | "mid_level" | "senior")[];
  crafts: string[];
  tags: string[];
};

export function matchingCriteriaFor(kind: PublicationKind, matching?: MatchingInput): MatchingInput {
  return {
    contentType: kind === "role" ? "role" : matching?.contentType === "training" ? "training" : "programme",
    careerLevels: matching?.careerLevels ?? [],
    crafts: matching?.crafts ?? [],
    tags: matching?.tags ?? [],
  };
}

function matchingTarget(kind: PublicationKind, id: string) {
  return kind === "role" ? { opportunityId: id, programmeId: null } : { opportunityId: null, programmeId: id };
}

async function hasPublication(kind: PublicationKind, id: string, tx: any = db): Promise<boolean> {
  const rows = kind === "role"
    ? await tx.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).limit(1)
    : await tx.select({ id: programmesTable.id }).from(programmesTable).where(eq(programmesTable.id, id)).limit(1);
  return rows.length > 0;
}

export async function getMatching(kind: PublicationKind, id: string) {
  if (!await hasPublication(kind, id)) return undefined;
  const [row] = await db.select().from(audienceMatchingTable)
    .where(kind === "role"
      ? eq(audienceMatchingTable.opportunityId, id)
      : eq(audienceMatchingTable.programmeId, id))
    .limit(1);
  const allowedType = kind === "role"
    ? row?.contentType === "role"
    : row?.contentType === "programme" || row?.contentType === "training";
  return {
    id: row?.id ?? id,
    contentType: allowedType ? row!.contentType as MatchingInput["contentType"] : kind,
    careerLevels: row?.careerLevels ?? [],
    crafts: row?.crafts ?? [],
    tags: row?.tags ?? [],
  };
}

export async function putMatching(kind: PublicationKind, id: string, input: MatchingInput) {
  if (!await hasPublication(kind, id)) return undefined;
  if ((kind === "role" && input.contentType !== "role")
      || (kind === "programme" && input.contentType !== "programme" && input.contentType !== "training")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }
  if ([...input.crafts, ...input.tags].some((value) => !value.trim() || value.trim().length > 120)) {
    throw new Error("INVALID_MATCHING_VALUE");
  }
  const normalizeUnique = (values: string[]) => {
    const labels = new Map<string, string>();
    for (const value of values) {
      const trimmed = value.trim();
      if (!labels.has(trimmed.toLocaleLowerCase())) labels.set(trimmed.toLocaleLowerCase(), trimmed);
    }
    return [...labels.values()];
  };
  const canonicalCrafts = normalizeUnique(input.crafts);
  const tags = normalizeUnique(input.tags);
  const target = matchingTarget(kind, id);
  const condition = kind === "role"
    ? eq(audienceMatchingTable.opportunityId, id)
    : eq(audienceMatchingTable.programmeId, id);
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: audienceMatchingTable.id })
      .from(audienceMatchingTable).where(condition).limit(1);
    const [row] = existing
      ? await tx.update(audienceMatchingTable).set({
        contentType: input.contentType,
        careerLevels: input.careerLevels,
        crafts: canonicalCrafts as string[],
        tags,
      }).where(eq(audienceMatchingTable.id, existing.id)).returning()
      : await tx.insert(audienceMatchingTable).values({
        ...target,
        contentType: input.contentType,
        careerLevels: input.careerLevels,
        crafts: canonicalCrafts as string[],
        tags,
      }).returning();
    await reconcilePublicationRecipients(tx, kind, id, {
      contentType: input.contentType,
      careerLevels: input.careerLevels,
      crafts: canonicalCrafts,
      tags,
    });
    return row;
  });
}

export type AudienceRecipientPreferences = Pick<
  typeof publicSubscriptionsTable.$inferSelect,
  "active" | "consent" | "allOpportunities" | "contentTypes" | "careerLevels" | "craft" | "crafts" | "interests"
>;

export function isEligibleAudienceRecipient(
  subscriber: AudienceRecipientPreferences,
  matching: MatchingInput,
): boolean {
  if (!subscriber.active || !subscriber.consent) return false;
  if (subscriber.allOpportunities) return true;
  // "content" is the general-only signup segment, not an opportunity preference.
  if (!subscriber.contentTypes.includes(matching.contentType)) return false;
  if (matching.contentType !== "training") {
    if (matching.careerLevels.length && !matching.careerLevels.some((level) => subscriber.careerLevels.includes(level))) return false;
    const subscriberCrafts = new Set(subscriber.crafts.map((craft) => craft.trim().toLocaleLowerCase()));
    if (typeof subscriber.craft === "string" && subscriber.craft.trim()) subscriberCrafts.add(subscriber.craft.trim().toLocaleLowerCase());
    if (matching.crafts.length && !matching.crafts.some((craft) => subscriberCrafts.has(craft.trim().toLocaleLowerCase()))) return false;
    if (matching.tags.length && !matching.tags.some((tag) =>
      subscriber.interests.some((interest) => interest.trim().toLocaleLowerCase() === tag.trim().toLocaleLowerCase()))) return false;
  }
  return true;
}

async function refreshCommunicationCount(tx: any, communicationId: string) {
  const [{ total }] = await tx.select({ total: count() }).from(crmCommunicationOutboxTable)
    .where(eq(crmCommunicationOutboxTable.communicationId, communicationId));
  await tx.update(crmCommunicationsTable).set({ recipientCount: Number(total) })
    .where(eq(crmCommunicationsTable.id, communicationId));
}

/** Reconcile a publication's pending queue against its current criteria in both directions. */
export async function reconcilePublicationRecipients(
  tx: any,
  kind: PublicationKind,
  id: string,
  matching?: MatchingInput,
) {
  const publicationCondition = kind === "role"
    ? eq(crmCommunicationsTable.opportunityId, id)
    : eq(crmCommunicationsTable.programmeId, id);
  const [communication] = await tx.select().from(crmCommunicationsTable)
    .where(and(publicationCondition, eq(crmCommunicationsTable.status, "pending"))).limit(1);
  if (!communication) return;

  const criteria = matchingCriteriaFor(kind, matching);
  const subscribers = await tx.select().from(publicSubscriptionsTable);
  const eligible = subscribers.filter((subscriber: typeof publicSubscriptionsTable.$inferSelect) =>
    isEligibleAudienceRecipient(subscriber, criteria));
  const outboxCondition = eq(crmCommunicationOutboxTable.communicationId, communication.id);
  const outbox = await tx.select().from(crmCommunicationOutboxTable).where(outboxCondition);
  const existingBySubscriber = new Map(outbox.map((delivery: typeof crmCommunicationOutboxTable.$inferSelect) =>
    [delivery.subscriberId, delivery]));
  const eligibleIds = new Set(eligible.map((subscriber: typeof publicSubscriptionsTable.$inferSelect) => subscriber.id));

  for (const delivery of outbox) {
    if (delivery.status === "pending" && !eligibleIds.has(delivery.subscriberId)) {
      await tx.delete(crmCommunicationOutboxTable).where(eq(crmCommunicationOutboxTable.id, delivery.id));
    }
  }

  const missing = eligible.filter((subscriber: typeof publicSubscriptionsTable.$inferSelect) =>
    !existingBySubscriber.has(subscriber.id));
  if (missing.length) {
    const publicationTarget = matchingTarget(kind, id);
    await tx.insert(crmCommunicationOutboxTable).values(missing.map((subscriber: typeof publicSubscriptionsTable.$inferSelect) => ({
      communicationId: communication.id,
      subscriberId: subscriber.id,
      ...publicationTarget,
      status: "pending" as const,
    }))).onConflictDoNothing();
  }
  await refreshCommunicationCount(tx, communication.id);
}

/** Reconcile pending notifications after subscriber preferences change, including newly eligible publications. */
export async function reconcilePendingDeliveries(tx: any, subscriber: typeof publicSubscriptionsTable.$inferSelect) {
  const [existingRows, communications] = await Promise.all([
    tx.select().from(crmCommunicationOutboxTable)
      .where(eq(crmCommunicationOutboxTable.subscriberId, subscriber.id)),
    tx.select().from(crmCommunicationsTable)
      .where(eq(crmCommunicationsTable.status, "pending")),
  ]);
  const pendingCommunicationIds = new Set(communications.map((communication: typeof crmCommunicationsTable.$inferSelect) => communication.id));
  const existingByPublication = new Map(existingRows.map((delivery: typeof crmCommunicationOutboxTable.$inferSelect) => [
    `${delivery.opportunityId ? "role" : "programme"}:${delivery.opportunityId ?? delivery.programmeId}`,
    delivery,
  ]));
  const changedCommunicationIds = new Set<string>();

  for (const delivery of existingRows) {
    if (delivery.status !== "pending" || !pendingCommunicationIds.has(delivery.communicationId)) continue;
    const kind = delivery.opportunityId ? "role" : "programme";
    const publicationId = delivery.opportunityId ?? delivery.programmeId!;
    const [criteria] = await tx.select().from(audienceMatchingTable)
      .where(kind === "role"
        ? eq(audienceMatchingTable.opportunityId, publicationId)
        : eq(audienceMatchingTable.programmeId, publicationId))
      .limit(1);
    if (isEligibleAudienceRecipient(subscriber, matchingCriteriaFor(kind, criteria))) continue;
    await tx.delete(crmCommunicationOutboxTable).where(eq(crmCommunicationOutboxTable.id, delivery.id));
    changedCommunicationIds.add(delivery.communicationId);
  }

  for (const communication of communications) {
    const kind = communication.opportunityId ? "role" : "programme";
    const publicationId = communication.opportunityId ?? communication.programmeId;
    if (!publicationId) continue;
    const key = `${kind}:${publicationId}`;
    const [criteria] = await tx.select().from(audienceMatchingTable)
      .where(kind === "role"
        ? eq(audienceMatchingTable.opportunityId, publicationId)
        : eq(audienceMatchingTable.programmeId, publicationId))
      .limit(1);
    if (!isEligibleAudienceRecipient(subscriber, matchingCriteriaFor(kind, criteria))) continue;
    if (existingByPublication.has(key)) continue;
    await tx.insert(crmCommunicationOutboxTable).values({
      communicationId: communication.id,
      subscriberId: subscriber.id,
      ...matchingTarget(kind, publicationId),
      status: "pending",
    }).onConflictDoNothing();
    changedCommunicationIds.add(communication.id);
  }

  for (const communicationId of changedCommunicationIds) await refreshCommunicationCount(tx, communicationId);
}

/** Transactionally creates a publication batch and idempotent pending recipient outbox rows. */
export async function enqueuePublication(
  tx: any,
  kind: PublicationKind,
  id: string,
  title: string,
): Promise<void> {
  const matching = kind === "role"
    ? (await tx.select().from(audienceMatchingTable).where(eq(audienceMatchingTable.opportunityId, id)).limit(1))[0]
    : (await tx.select().from(audienceMatchingTable).where(eq(audienceMatchingTable.programmeId, id)).limit(1))[0];
  const criteria = matchingCriteriaFor(kind, matching);
  const subscribers = await tx.select().from(publicSubscriptionsTable);
  const eligible = subscribers.filter((subscriber: typeof publicSubscriptionsTable.$inferSelect) =>
    isEligibleAudienceRecipient(subscriber, criteria));
  const publicationTarget = matchingTarget(kind, id);
  let [communication] = await tx.insert(crmCommunicationsTable).values({
    ...publicationTarget,
    channel: "email",
    status: "pending",
    subject: title,
    recipientCount: eligible.length,
  }).onConflictDoNothing().returning();
  if (!communication) {
    [communication] = kind === "role"
      ? await tx.select().from(crmCommunicationsTable).where(eq(crmCommunicationsTable.opportunityId, id)).limit(1)
      : await tx.select().from(crmCommunicationsTable).where(eq(crmCommunicationsTable.programmeId, id)).limit(1);
    if (!communication) return;
  }
  if (eligible.length) {
    await tx.insert(crmCommunicationOutboxTable).values(eligible.map((subscriber: typeof publicSubscriptionsTable.$inferSelect) => ({
      communicationId: communication.id,
      subscriberId: subscriber.id,
      ...publicationTarget,
      status: "pending" as const,
    }))).onConflictDoNothing();
  }
  const [{ recipientTotal }] = await tx.select({ recipientTotal: count() })
    .from(crmCommunicationOutboxTable)
    .where(eq(crmCommunicationOutboxTable.communicationId, communication.id));
  await tx.update(crmCommunicationsTable)
    .set({ recipientCount: Number(recipientTotal) })
    .where(eq(crmCommunicationsTable.id, communication.id));
}

export async function listAudience(filters: {
  search?: string;
  active?: boolean;
  source?: string;
  careerLevel?: string;
  contentType?: string;
}) {
  const rows = await db.select().from(publicSubscriptionsTable).where(and(
    filters.active === undefined ? undefined : eq(publicSubscriptionsTable.active, filters.active),
    filters.source ? eq(publicSubscriptionsTable.acquisitionSource, filters.source) : undefined,
    filters.careerLevel ? sql`${filters.careerLevel} = any(${publicSubscriptionsTable.careerLevels})` : undefined,
    filters.search
      ? or(ilike(publicSubscriptionsTable.email, `%${filters.search}%`), ilike(publicSubscriptionsTable.name, `%${filters.search}%`))
      : undefined,
  )).orderBy(desc(publicSubscriptionsTable.createdAt));
  return rows.filter((row) => !filters.contentType || row.contentTypes.includes(filters.contentType))
    .map((row) => ({
      subscriberId: row.id,
      email: row.email,
      name: row.name,
      active: row.active,
      consentedAt: row.consentedAt,
      createdAt: row.createdAt,
      craft: row.craft,
      careerLevel: row.careerLevel,
      location: row.location,
      acquisitionSource: row.acquisitionSource,
      acquisitionDetail: row.acquisitionDetail,
      interests: row.interests,
      contentTypes: row.contentTypes,
      careerLevels: row.careerLevels,
      crafts: row.crafts,
      allOpportunities: row.allOpportunities,
    }));
}

export async function getAudienceMember(id: string) {
  return (await listAudience({})).find((row) => row.subscriberId === id);
}

export function summarizeAcquisitionDetails(
  subscribers: Pick<typeof publicSubscriptionsTable.$inferSelect, "acquisitionSource" | "acquisitionDetail">[],
) {
  const details = new Map<string, { source: string | null; detail: string; count: number }>();
  for (const row of subscribers) {
    if (!row.acquisitionDetail?.trim()) continue;
    const source = row.acquisitionSource?.trim() || null;
    const detail = row.acquisitionDetail.trim();
    const key = JSON.stringify([source?.toLocaleLowerCase(), detail.toLocaleLowerCase()]);
    const current = details.get(key);
    details.set(key, current ? { ...current, count: current.count + 1 } : { source, detail, count: 1 });
  }
  return [...details.values()].sort((a, b) => b.count - a.count);
}

export async function crmDashboard() {
  const [subscribers, events, deliveries, recent] = await Promise.all([
    db.select().from(publicSubscriptionsTable),
    db.select().from(publicEngagementEventsTable),
    db.select().from(crmCommunicationOutboxTable),
    db.select().from(publicSubscriptionsTable).orderBy(desc(publicSubscriptionsTable.createdAt)).limit(10),
  ]);
  const acquisition = new Map<string | null, number>();
  for (const row of subscribers) {
    acquisition.set(row.acquisitionSource, (acquisition.get(row.acquisitionSource) ?? 0) + 1);
  }
  return {
    counts: {
      total: subscribers.length,
      active: subscribers.filter((row) => row.active).length,
      inactive: subscribers.filter((row) => !row.active).length,
    },
    acquisitionBreakdown: [...acquisition.entries()].map(([source, total]) => ({ source, count: total })),
    acquisitionDetailBreakdown: summarizeAcquisitionDetails(subscribers),
    engagement: {
      views: events.filter((event) => event.event === "view").length,
      applications: events.filter((event) => event.event === "apply").length,
      roleViews: events.filter((event) => event.event === "view" && event.opportunityId).length,
      programmeViews: events.filter((event) => event.event === "view" && event.programmeId).length,
    },
    delivery: {
      sent: deliveries.filter((delivery) => delivery.status === "sent").length,
      delivered: deliveries.filter((delivery) => delivery.status === "delivered").length,
      failed: deliveries.filter((delivery) => delivery.status === "failed").length,
      pending: deliveries.filter((delivery) => delivery.status === "pending").length,
    },
    recentRegistrations: recent.map((row) => ({
      subscriberId: row.id, email: row.email, name: row.name, active: row.active,
      consentedAt: row.consentedAt, createdAt: row.createdAt, craft: row.craft,
      careerLevel: row.careerLevel, location: row.location, acquisitionSource: row.acquisitionSource,
      acquisitionDetail: row.acquisitionDetail, interests: row.interests, contentTypes: row.contentTypes,
      careerLevels: row.careerLevels, crafts: row.crafts, allOpportunities: row.allOpportunities,
    })),
  };
}

export async function listCommunications() {
  return db.select().from(crmCommunicationsTable).orderBy(desc(crmCommunicationsTable.createdAt));
}

export async function listEnquiries() {
  return db.select().from(crmEnquiriesTable).orderBy(desc(crmEnquiriesTable.createdAt));
}

export async function createEnquiry(input: {
  name?: string; email: string; subject?: string; source?: string; message: string;
}) {
  const [row] = await db.insert(crmEnquiriesTable).values({
    name: input.name?.trim() || null,
    email: input.email.trim().toLowerCase(),
    subject: input.subject?.trim() || null,
    source: input.source?.trim() || "Manual entry",
    message: input.message.trim(),
  }).returning();
  return row;
}

export async function updateEnquiry(id: string, status: "new" | "open" | "in_progress" | "resolved" | "closed") {
  const [row] = await db.update(crmEnquiriesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(crmEnquiriesTable.id, id))
    .returning();
  return row;
}

export async function crmTaxonomy() {
  const [crafts, interests, sources, subscriberCrafts, matchingCrafts] = await Promise.all([
    db.select({ label: opportunityOptionsTable.label }).from(opportunityOptionsTable)
      .where(eq(opportunityOptionsTable.active, true)),
    db.select({ values: publicSubscriptionsTable.interests }).from(publicSubscriptionsTable),
    db.select({ value: publicSubscriptionsTable.acquisitionSource }).from(publicSubscriptionsTable),
    db.select({ craft: publicSubscriptionsTable.craft, crafts: publicSubscriptionsTable.crafts }).from(publicSubscriptionsTable),
    db.select({ crafts: audienceMatchingTable.crafts }).from(audienceMatchingTable),
  ]);
  const allCrafts = new Set([
    ...crafts.map(({ label }) => label),
    ...subscriberCrafts.flatMap(({ craft, crafts: values }) => [craft, ...values].filter((value): value is string => Boolean(value))),
    ...matchingCrafts.flatMap(({ crafts: values }) => values),
  ]);
  return {
    interests: [...new Set(interests.flatMap(({ values }) => values))].sort(),
    crafts: [...allCrafts].sort(),
    acquisitionSources: [...new Set(sources.map(({ value }) => value).filter((value): value is string => Boolean(value)))].sort(),
    contentTypes: ["role", "programme", "training"] as const,
    careerLevels: ["new_entrant", "mid_level", "senior"] as const,
  };
}

export async function recordEngagement(kind: PublicationKind, id: string, event: "view" | "apply") {
  if (kind === "role") {
    const [opportunity] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable)
      .where(and(eq(opportunitiesTable.id, id), inArray(opportunitiesTable.status, event === "apply" ? ["published"] : ["published", "closed", "filled"])))
      .limit(1);
    if (!opportunity) return false;
    await db.insert(publicEngagementEventsTable).values({ opportunityId: id, event });
  } else {
    const [programme] = await db.select({ id: programmesTable.id }).from(programmesTable)
      .where(and(eq(programmesTable.id, id), inArray(programmesTable.status, event === "apply" ? ["published"] : ["published", "closed"])))
      .limit(1);
    if (!programme) return false;
    await db.insert(publicEngagementEventsTable).values({ programmeId: id, event });
  }
  return true;
}