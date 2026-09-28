import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  audienceMatchingTable, crmCommunicationOutboxTable, crmCommunicationsTable,
  db, opportunitiesTable, programmesTable, publicSubscriptionsTable,
} from "@workspace/db";
import { isEligibleAudienceRecipient, matchingCriteriaFor, refreshPublicationBatch } from "./audience-crm-service";
import { applyProviderEvents } from "./provider-delivery-events";
import type { MatchingInput } from "./audience-crm-service";
import { logger } from "./logger";
import { isTemporaryTestLoginEnabled } from "./development-session";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 90_000;
const IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60_000;
const mailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DeliveryConfig = { from: string; siteUrl: string; testEmail?: string; activatedAt?: Date };
export function publicationDeliveryConfig(env: NodeJS.ProcessEnv = process.env): {
  test?: DeliveryConfig; live?: DeliveryConfig;
} {
  const from = env.PUBLICATION_EMAIL_FROM?.trim();
  const siteUrl = env.PUBLIC_OPPORTUNITIES_URL?.trim();
  const testEmail = env.PUBLICATION_TEST_EMAIL?.trim();
  if (!from || !siteUrl || !URL.canParse(siteUrl) || new URL(siteUrl).protocol !== "https:") return {};
  const test = testEmail && mailAddress.test(testEmail) ? { from, siteUrl, testEmail } : undefined;
  const rawCutoff = env.PUBLICATION_ALERTS_ACTIVATED_AT;
  const activatedAt = rawCutoff ? new Date(rawCutoff) : undefined;
  const live = env.PUBLICATION_EMAIL_MODE === "live" && env.PUBLICATION_EMAIL_APPROVED === "true"
    && activatedAt && !Number.isNaN(activatedAt.getTime())
    ? { from, siteUrl, activatedAt } : undefined;
  return { test, live };
}

type Publication = { id: string; kind: "role" | "programme"; title: string; slug: string; status: string };
type Message = { from: string; to: string; subject: string; text: string; idempotencyKey: string };

export function publicationMessage(
  publication: Publication, config: DeliveryConfig, recipient: string, idempotencyKey: string, isTest = false,
): Message {
  const root = new URL(config.siteUrl.endsWith("/") ? config.siteUrl : `${config.siteUrl}/`);
  const path = publication.kind === "role" ? `roles/${encodeURIComponent(publication.slug)}` : `opportunities/${encodeURIComponent(publication.slug)}`;
  const itemUrl = new URL(path, root).toString();
  const manageUrl = new URL("unsubscribe", root).toString();
  const category = publication.kind === "role" ? "role" : "programme";
  return {
    from: config.from, to: recipient, idempotencyKey,
    subject: `${isTest ? "[TEST] " : ""}New ${category}: ${publication.title}`,
    text: [
      isTest ? "TEST PREVIEW — this message went only to the configured test mailbox. No subscribers were emailed." : `A new ${category} matching your HETV Opportunities Hub interests has been published.`,
      "", publication.title, itemUrl, "",
      "Manage your preferences or unsubscribe by verifying your email:",
      manageUrl, "",
      "You received this message because you signed up for HETV Opportunities Hub updates.",
    ].join("\n"),
  };
}

export function publicationTestMessage(publication: Publication, config: DeliveryConfig): Message {
  if (!config.testEmail) throw new Error("TEST_NOT_CONFIGURED");
  const message = publicationMessage(publication, config, config.testEmail, "", true);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([message.from, message.to, message.subject, message.text]))
    .digest("hex").slice(0, 24);
  return { ...message, idempotencyKey: `publication-test-${publication.id}-${fingerprint}` };
}

export async function sendPublicationEmail(message: Message): Promise<string> {
  const response = await new ReplitConnectors().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey },
    body: JSON.stringify({ from: message.from, to: [message.to], subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`Resend rejected delivery (${response.status})`);
  const body = await response.json() as { id?: unknown };
  if (typeof body.id !== "string" || !body.id) throw new Error("Resend returned no message reference");
  return body.id;
}

export function publicationSampleMessage(config: DeliveryConfig, at = new Date()): Message {
  if (!config.testEmail) throw new Error("TEST_NOT_CONFIGURED");
  const root = new URL(config.siteUrl.endsWith("/") ? config.siteUrl : `${config.siteUrl}/`);
  const mailboxKey = createHash("sha256").update(config.testEmail.toLowerCase()).digest("hex").slice(0, 16);
  return {
    from: config.from,
    to: config.testEmail,
    subject: "[TEST] HETV publication alerts — configuration check",
    text: [
      "TEST PREVIEW — sent only to the approved test mailbox. No role or programme has been published for this test, and no subscribers were emailed.",
      "",
      "When a matching role or programme is first published, its alert will contain a link to that publication.",
      `Browse roles: ${new URL("roles", root)}`,
      `Manage your preferences or unsubscribe by verifying your email: ${new URL("unsubscribe", root)}`,
      "",
      "HETV Opportunities Hub",
    ].join("\n"),
    idempotencyKey: `publication-sample-${mailboxKey}-${at.toISOString().slice(0, 10)}`,
  };
}

export async function sendPublicationSampleTest(config = publicationDeliveryConfig().test) {
  if (!config?.testEmail) throw new Error("TEST_NOT_CONFIGURED");
  const providerReference = await sendPublicationEmail(publicationSampleMessage(config));
  return { status: "accepted" as const, providerReference };
}

async function loadPublication(communication: typeof crmCommunicationsTable.$inferSelect): Promise<Publication | undefined> {
  if (communication.opportunityId) {
    const [row] = await db.select({ id: opportunitiesTable.id, title: opportunitiesTable.title,
      slug: opportunitiesTable.slug, status: opportunitiesTable.status })
      .from(opportunitiesTable).where(eq(opportunitiesTable.id, communication.opportunityId)).limit(1);
    return row ? { ...row, kind: "role" } : undefined;
  }
  if (communication.programmeId) {
    const [row] = await db.select({ id: programmesTable.id, title: programmesTable.title,
      slug: programmesTable.slug, status: programmesTable.status })
      .from(programmesTable).where(eq(programmesTable.id, communication.programmeId)).limit(1);
    return row ? { ...row, kind: "programme" } : undefined;
  }
  return undefined;
}

export async function sendPublicationTest(communicationId: string, config = publicationDeliveryConfig().test) {
  if (!config?.testEmail) throw new Error("TEST_NOT_CONFIGURED");
  const [communication] = await db.select().from(crmCommunicationsTable)
    .where(eq(crmCommunicationsTable.id, communicationId)).limit(1);
  if (!communication) return undefined;
  const publication = await loadPublication(communication);
  if (!publication || publication.status !== "published") throw new Error("NOT_PUBLISHED");
  let reference: string;
  try {
    reference = await sendPublicationEmail(publicationTestMessage(publication, config));
  } catch {
    await db.update(crmCommunicationsTable).set({ testLastError: "Test delivery failed" })
      .where(eq(crmCommunicationsTable.id, communicationId));
    throw new Error("TEST_DELIVERY_FAILED");
  }
  try {
    const [updated] = await db.update(crmCommunicationsTable).set({
      testSentAt: new Date(), testProviderReference: reference, testLastError: null,
    }).where(eq(crmCommunicationsTable.id, communicationId)).returning();
    return updated;
  } catch {
    // The provider accepted the test. Do not claim it failed or retry automatically.
    throw new Error("TEST_RECORDING_FAILED");
  }
}

export function canDeliverToSubscriber(
  subscriber: typeof publicSubscriptionsTable.$inferSelect,
  publication: Publication,
  matching: typeof audienceMatchingTable.$inferSelect | undefined,
): boolean {
  if (publication.status !== "published") return false;
  const criteria = matching && matching.contentType !== "content"
    ? { ...matching, contentType: matching.contentType as MatchingInput["contentType"],
      careerLevels: matching.careerLevels as MatchingInput["careerLevels"] } : undefined;
  return isEligibleAudienceRecipient(subscriber, matchingCriteriaFor(publication.kind, criteria));
}

export type DeliveryOutcome =
  | { kind: "skipped" }
  | { kind: "sent"; reference: string }
  | { kind: "failed"; exhausted: boolean; nextAttemptAt: Date | null; reason: string };

/** A completion from an expired lease must never overwrite a newer claimant's outcome. */
export function claimedDeliveryWhere(id: string, attempts: number) {
  return and(
    eq(crmCommunicationOutboxTable.id, id),
    eq(crmCommunicationOutboxTable.status, "processing"),
    eq(crmCommunicationOutboxTable.attempts, attempts),
  );
}

export async function deliverClaimedPublication(input: {
  id: string;
  attempts: number;
  firstAttemptAt: Date | null;
  publication: Publication | undefined;
  subscriber: typeof publicSubscriptionsTable.$inferSelect | undefined;
  matching: typeof audienceMatchingTable.$inferSelect | undefined;
  config: DeliveryConfig;
  at: Date;
}, send: (message: Message) => Promise<string>): Promise<DeliveryOutcome> {
  const { id, attempts, firstAttemptAt, publication, subscriber, matching, config, at } = input;
  if (!publication || !subscriber || !canDeliverToSubscriber(subscriber, publication, matching)) {
    return { kind: "skipped" };
  }
  if (firstAttemptAt && at.getTime() - firstAttemptAt.getTime() >= IDEMPOTENCY_WINDOW_MS) {
    return { kind: "failed", exhausted: true, nextAttemptAt: null,
      reason: "Retry requires staff review after provider deduplication window" };
  }
  try {
    const reference = await send(publicationMessage(publication, config, subscriber.email, `publication-${id}`));
    return { kind: "sent", reference };
  } catch {
    return {
      kind: "failed", exhausted: attempts >= MAX_ATTEMPTS,
      nextAttemptAt: attempts >= MAX_ATTEMPTS
        ? null : new Date(at.getTime() + Math.min(60 * 60_000, 60_000 * 2 ** attempts)),
      reason: "Delivery attempt failed",
    };
  }
}

export async function processPublicationDeliveries(
  config = publicationDeliveryConfig().live,
  send = sendPublicationEmail,
  at = new Date(),
): Promise<number> {
  // The default configuration performs no reads or sends, including in published deployments.
  if (isTemporaryTestLoginEnabled()) return 0;
  if (!config?.activatedAt) return 0;
  const candidates = await db.select({ id: crmCommunicationOutboxTable.id })
    .from(crmCommunicationOutboxTable)
    .innerJoin(crmCommunicationsTable, eq(crmCommunicationOutboxTable.communicationId, crmCommunicationsTable.id))
    .where(and(
      gte(crmCommunicationsTable.createdAt, config.activatedAt),
      inArray(crmCommunicationsTable.status, ["pending", "processing", "failed"]),
      lt(crmCommunicationOutboxTable.attempts, MAX_ATTEMPTS),
      or(
        and(inArray(crmCommunicationOutboxTable.status, ["pending", "failed"]),
          or(isNull(crmCommunicationOutboxTable.nextAttemptAt), lte(crmCommunicationOutboxTable.nextAttemptAt, at))),
        and(eq(crmCommunicationOutboxTable.status, "processing"), lt(crmCommunicationOutboxTable.leaseUntil, at)),
      ),
    )).orderBy(crmCommunicationOutboxTable.createdAt).limit(20);
  for (const candidate of candidates) {
    const [delivery] = await db.update(crmCommunicationOutboxTable).set({
      status: "processing", leaseUntil: new Date(at.getTime() + LEASE_MS),
      attempts: sql`${crmCommunicationOutboxTable.attempts} + 1`,
      firstAttemptAt: sql`coalesce(${crmCommunicationOutboxTable.firstAttemptAt}, ${at})`,
      nextAttemptAt: null,
    }).where(and(eq(crmCommunicationOutboxTable.id, candidate.id),
      lt(crmCommunicationOutboxTable.attempts, MAX_ATTEMPTS),
      or(
        and(inArray(crmCommunicationOutboxTable.status, ["pending", "failed"]),
          or(isNull(crmCommunicationOutboxTable.nextAttemptAt), lte(crmCommunicationOutboxTable.nextAttemptAt, at))),
        and(eq(crmCommunicationOutboxTable.status, "processing"), lt(crmCommunicationOutboxTable.leaseUntil, at)),
      ))).returning();
    if (!delivery) continue;
    const [communication] = await db.select().from(crmCommunicationsTable)
      .where(eq(crmCommunicationsTable.id, delivery.communicationId)).limit(1);
    if (!communication || communication.createdAt < config.activatedAt) continue;
    try {
      const publication = await loadPublication(communication);
      const [subscriber] = await db.select().from(publicSubscriptionsTable)
        .where(eq(publicSubscriptionsTable.id, delivery.subscriberId)).limit(1);
      const [matching] = publication
        ? await db.select().from(audienceMatchingTable)
          .where(publication.kind === "role"
            ? eq(audienceMatchingTable.opportunityId, publication.id)
            : eq(audienceMatchingTable.programmeId, publication.id)).limit(1)
        : [];
      const result = await deliverClaimedPublication({
        id: delivery.id, attempts: delivery.attempts, firstAttemptAt: delivery.firstAttemptAt,
        publication, subscriber, matching, config, at,
      }, send);
      if (result.kind === "skipped") {
        await db.delete(crmCommunicationOutboxTable)
          .where(claimedDeliveryWhere(delivery.id, delivery.attempts));
      } else if (result.kind === "failed") {
        logger.warn({ deliveryId: delivery.id }, "Publication delivery attempt failed");
        await db.update(crmCommunicationOutboxTable).set({
          status: "failed", attempts: result.exhausted ? MAX_ATTEMPTS : delivery.attempts,
          leaseUntil: null, lastError: result.reason, nextAttemptAt: result.nextAttemptAt,
        }).where(claimedDeliveryWhere(delivery.id, delivery.attempts));
      } else {
        const [accepted] = await db.update(crmCommunicationOutboxTable).set({
          status: "sent", sentAt: new Date(), providerReference: result.reference,
          leaseUntil: null, nextAttemptAt: null, lastError: null,
        }).where(claimedDeliveryWhere(delivery.id, delivery.attempts)).returning();
        if (accepted) await applyProviderEvents(result.reference);
      }
    } catch {
      logger.warn({ deliveryId: delivery.id }, "Publication delivery attempt failed");
      await db.update(crmCommunicationOutboxTable).set({
        status: "failed", leaseUntil: null, lastError: "Delivery attempt failed",
        nextAttemptAt: delivery.attempts < MAX_ATTEMPTS
          ? new Date(at.getTime() + Math.min(60 * 60_000, 60_000 * 2 ** delivery.attempts)) : null,
      }).where(claimedDeliveryWhere(delivery.id, delivery.attempts));
    }
    await refreshPublicationBatch(delivery.communicationId);
  }
  return candidates.length;
}

let busy = false;
export function startPublicationDeliveryWorker() {
  if (isTemporaryTestLoginEnabled()) return;
  if (!publicationDeliveryConfig().live) return;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await processPublicationDeliveries(); }
    catch (error) { logger.error({ err: error }, "Publication delivery worker failed"); }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void tick(); }, 30_000);
  timer.unref();
  void tick();
}