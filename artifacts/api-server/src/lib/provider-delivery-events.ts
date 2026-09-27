import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import {
  crmCommunicationOutboxTable, crmProviderEventsTable, db, publicSubscriptionsTable,
} from "@workspace/db";
import { reconcilePendingDeliveries, refreshPublicationBatch } from "./audience-crm-service";

const eventTypes = ["email.delivered", "email.bounced", "email.complained"] as const;
type EventType = typeof eventTypes[number];
export type ProviderEvent = { id: string; providerReference: string; event: EventType; occurredAt: Date };

/** Svix/Resend signature over the exact HTTP bytes; never trust parsed JSON for signing. */
export function verifyResendSignature(
  body: Buffer, headers: { id?: string; timestamp?: string; signature?: string }, secret: string | undefined,
  now = Date.now(),
): boolean {
  if (!secret?.startsWith("whsec_") || !headers.id || !headers.timestamp || !headers.signature
    || !/^\d{10}$/.test(headers.timestamp) || !Buffer.isBuffer(body)
    || Math.abs(now / 1000 - Number(headers.timestamp)) > 300) return false;
  const key = Buffer.from(secret.slice(6), "base64");
  if (key.length < 16) return false;
  const digest = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.`).update(body).digest();
  return headers.signature.split(" ").some(part => {
    if (!part.startsWith("v1,")) return false;
    const candidate = Buffer.from(part.slice(3), "base64");
    return candidate.length === digest.length && timingSafeEqual(candidate, digest);
  });
}

export function parseResendEvent(body: Buffer, id: string): ProviderEvent | null {
  let payload: unknown;
  try { payload = JSON.parse(body.toString("utf8")); } catch { return null; }
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (!eventTypes.includes(record.type as EventType)) return null;
  const data = record.data;
  if (!data || typeof data !== "object") return null;
  const providerReference = (data as Record<string, unknown>).email_id;
  const occurredAt = record.created_at;
  if (typeof providerReference !== "string" || !providerReference || providerReference.length > 255
    || typeof occurredAt !== "string" || !Number.isFinite(Date.parse(occurredAt))
    || !id || id.length > 255) return null;
  return { id, providerReference, event: record.type as EventType, occurredAt: new Date(occurredAt) };
}

/** Pure transition so duplicate and reordered delivery events cannot undo a bounce/complaint. */
export function providerTransition(
  status: string, suppression: string | null, events: EventType[],
): { status: "sent" | "delivered" | "failed"; suppression: "bounce" | "complaint" | null } | null {
  if (!["sent", "delivered", "failed"].includes(status)) return null;
  const reason = events.includes("email.complained") || suppression === "complaint" ? "complaint"
    : events.includes("email.bounced") || suppression === "bounce" ? "bounce" : null;
  if (reason) return { status: "failed", suppression: reason };
  if (status === "failed") return null;
  return { status: events.includes("email.delivered") || status === "delivered" ? "delivered" : "sent", suppression: null };
}

/** Unmatched events remain recorded for a send that has not yet saved its provider reference. */
export async function applyProviderEvents(providerReference: string): Promise<boolean> {
  const changedCommunicationIds = await db.transaction(async tx => {
    const rows = await tx.select().from(crmCommunicationOutboxTable)
      .where(eq(crmCommunicationOutboxTable.providerReference, providerReference)).for("update");
    if (!rows.length) return [];
    const events = await tx.select().from(crmProviderEventsTable)
      .where(eq(crmProviderEventsTable.providerReference, providerReference));
    const changed = new Set<string>();
    for (const row of rows) {
      const transition = providerTransition(row.status, row.providerFailure, events.map(event => event.event as EventType));
      if (!transition || (transition.status === row.status && transition.suppression === row.providerFailure
        && (transition.status !== "delivered" || row.deliveredAt))) continue;
      const confirmed = events.filter(event => event.event === "email.delivered")
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
      await tx.update(crmCommunicationOutboxTable).set({
        status: transition.status,
        providerFailure: transition.suppression,
        deliveredAt: transition.status === "delivered" ? (row.deliveredAt ?? confirmed?.occurredAt) : null,
        lastError: transition.suppression === "bounce" ? "Provider reported a bounce"
          : transition.suppression === "complaint" ? "Provider reported a complaint" : null,
        nextAttemptAt: null,
        ...(transition.suppression ? { attempts: 5 } : {}),
      }).where(eq(crmCommunicationOutboxTable.id, row.id));
      if (transition.suppression) {
        // A verified complaint/bounce is tied to an actual outbox recipient, not an
        // arbitrary email address supplied in the webhook body.
        const [subscriber] = await tx.update(publicSubscriptionsTable).set({
          active: false, deliverySuppression: transition.suppression,
          deliverySuppressedAt: new Date(),
        }).where(and(eq(publicSubscriptionsTable.id, row.subscriberId),
          transition.suppression === "complaint"
            ? or(isNull(publicSubscriptionsTable.deliverySuppression), eq(publicSubscriptionsTable.deliverySuppression, "bounce"))
            : isNull(publicSubscriptionsTable.deliverySuppression)))
          .returning();
        if (subscriber) await reconcilePendingDeliveries(tx, subscriber);
      }
      changed.add(row.communicationId);
    }
    return [...changed];
  });
  for (const id of changedCommunicationIds) await refreshPublicationBatch(id);
  return changedCommunicationIds.length > 0;
}

export async function recordProviderEvent(event: ProviderEvent): Promise<boolean> {
  await db.insert(crmProviderEventsTable).values(event).onConflictDoNothing();
  return applyProviderEvents(event.providerReference);
}