import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { opportunitiesTable } from "./opportunities";
import { programmesTable } from "./programmes";
import { publicSubscriptionsTable } from "./public-subscriptions";

export const audienceContentTypeEnum = pgEnum("audience_content_type", [
  "content",
  "role",
  "programme",
  "training",
]);
export const crmEnquiryStatusEnum = pgEnum("crm_enquiry_status", [
  "new",
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const crmDeliveryStatusEnum = pgEnum("crm_delivery_status", [
  "pending",
  "processing",
  "sent",
  "delivered",
  "failed",
]);

export const audienceMatchingTable = pgTable("audience_matching", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id").references(() => opportunitiesTable.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").references(() => programmesTable.id, { onDelete: "cascade" }),
  contentType: audienceContentTypeEnum("content_type").notNull(),
  careerLevels: text("career_levels").array().notNull().default([]),
  crafts: text("crafts").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("audience_matching_exactly_one_publication", sql`num_nonnulls(${table.opportunityId}, ${table.programmeId}) = 1`),
  uniqueIndex("audience_matching_opportunity_unique").on(table.opportunityId),
  uniqueIndex("audience_matching_programme_unique").on(table.programmeId),
  index("audience_matching_content_type_idx").on(table.contentType),
]);

export const crmCommunicationsTable = pgTable("crm_communications", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id").references(() => opportunitiesTable.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").references(() => programmesTable.id, { onDelete: "cascade" }),
  channel: text("channel").notNull().default("email"),
  status: crmDeliveryStatusEnum("status").notNull().default("pending"),
  subject: text("subject"),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  testSentAt: timestamp("test_sent_at", { withTimezone: true }),
  testProviderReference: text("test_provider_reference"),
  testLastError: text("test_last_error"),
}, (table) => [
  check("crm_communications_exactly_one_publication", sql`num_nonnulls(${table.opportunityId}, ${table.programmeId}) = 1`),
  uniqueIndex("crm_communications_opportunity_unique").on(table.opportunityId),
  uniqueIndex("crm_communications_programme_unique").on(table.programmeId),
  index("crm_communications_created_idx").on(table.createdAt),
]);

export const crmCommunicationOutboxTable = pgTable("crm_communication_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  communicationId: uuid("communication_id").notNull().references(() => crmCommunicationsTable.id, { onDelete: "cascade" }),
  subscriberId: uuid("subscriber_id").notNull().references(() => publicSubscriptionsTable.id, { onDelete: "cascade" }),
  opportunityId: uuid("opportunity_id").references(() => opportunitiesTable.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").references(() => programmesTable.id, { onDelete: "cascade" }),
  status: crmDeliveryStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  providerReference: text("provider_reference"),
  providerFailure: text("provider_failure"),
  lastError: text("last_error"),
  attempts: integer("attempts").notNull().default(0),
  firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  deferredReason: text("deferred_reason"),
  claimVersion: integer("claim_version").notNull().default(0),
  sendingAccount: text("sending_account"),
}, (table) => [
  check("crm_outbox_exactly_one_publication", sql`num_nonnulls(${table.opportunityId}, ${table.programmeId}) = 1`),
  uniqueIndex("crm_outbox_opportunity_subscriber_unique")
    .on(table.opportunityId, table.subscriberId)
    .where(sql`${table.opportunityId} is not null`),
  uniqueIndex("crm_outbox_programme_subscriber_unique")
    .on(table.programmeId, table.subscriberId)
    .where(sql`${table.programmeId} is not null`),
  index("crm_outbox_status_created_idx").on(table.status, table.createdAt),
  index("crm_outbox_provider_reference_idx").on(table.providerReference),
]);

export const crmProviderEventsTable = pgTable("crm_provider_events", {
  id: text("id").primaryKey(),
  providerReference: text("provider_reference").notNull(),
  event: text("event").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("crm_provider_event_valid", sql`${table.event} in ('email.delivered', 'email.bounced', 'email.complained')`),
  index("crm_provider_events_reference_idx").on(table.providerReference),
]);

export const publicEngagementEventsTable = pgTable("public_engagement_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id").references(() => opportunitiesTable.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").references(() => programmesTable.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("public_engagement_exactly_one_publication", sql`num_nonnulls(${table.opportunityId}, ${table.programmeId}) = 1`),
  check("public_engagement_event_valid", sql`${table.event} in ('view', 'apply')`),
  index("public_engagement_opportunity_event_idx").on(table.opportunityId, table.event, table.createdAt),
  index("public_engagement_programme_event_idx").on(table.programmeId, table.event, table.createdAt),
]);

export const crmEnquiriesTable = pgTable("crm_enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  subject: text("subject"),
  source: text("source"),
  message: text("message").notNull(),
  status: crmEnquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_enquiries_status_created_idx").on(table.status, table.createdAt),
]);

export const insertAudienceMatchingSchema = createInsertSchema(audienceMatchingTable).omit({ id: true, updatedAt: true });
export const insertCrmCommunicationSchema = createInsertSchema(crmCommunicationsTable).omit({ id: true, createdAt: true, sentAt: true });
export const insertCrmCommunicationOutboxSchema = createInsertSchema(crmCommunicationOutboxTable).omit({ id: true, createdAt: true, sentAt: true });
export const insertPublicEngagementEventSchema = createInsertSchema(publicEngagementEventsTable).omit({ id: true, createdAt: true });
export const insertCrmEnquirySchema = createInsertSchema(crmEnquiriesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type AudienceMatching = typeof audienceMatchingTable.$inferSelect;
export type CrmCommunication = typeof crmCommunicationsTable.$inferSelect;
export type CrmCommunicationOutbox = typeof crmCommunicationOutboxTable.$inferSelect;
export type PublicEngagementEvent = typeof publicEngagementEventsTable.$inferSelect;
export type CrmEnquiry = typeof crmEnquiriesTable.$inferSelect;
export type InsertAudienceMatching = z.infer<typeof insertAudienceMatchingSchema>;
export type InsertCrmCommunication = z.infer<typeof insertCrmCommunicationSchema>;
export type InsertCrmCommunicationOutbox = z.infer<typeof insertCrmCommunicationOutboxSchema>;
export type InsertPublicEngagementEvent = z.infer<typeof insertPublicEngagementEventSchema>;
export type InsertCrmEnquiry = z.infer<typeof insertCrmEnquirySchema>;