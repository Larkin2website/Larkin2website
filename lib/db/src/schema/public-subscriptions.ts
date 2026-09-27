import { sql } from "drizzle-orm";
import { boolean, char, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publicSubscriptionsTable = pgTable("public_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  craft: text("craft"),
  careerLevel: text("career_level"),
  location: text("location"),
  acquisitionSource: text("acquisition_source"),
  acquisitionDetail: text("acquisition_detail"),
  interests: text("interests").array().notNull().default([]),
  contentTypes: text("content_types").array().notNull().default([]),
  careerLevels: text("career_levels").array().notNull().default([]),
  crafts: text("crafts").array().notNull().default([]),
  allOpportunities: boolean("all_opportunities").notNull().default(false),
  consent: boolean("consent").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  managementTokenHash: char("management_token_hash", { length: 64 }).notNull(),
  active: boolean("active").notNull().default(true),
  deliverySuppression: text("delivery_suppression"),
  deliverySuppressedAt: timestamp("delivery_suppressed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("public_subscriptions_consent_true", sql`${table.consent} = true`),
  check("public_subscriptions_career_level_valid", sql`${table.careerLevel} is null or ${table.careerLevel} in ('new_entrant', 'mid_level', 'senior')`),
  uniqueIndex("public_subscriptions_email_unique").on(table.email),
  uniqueIndex("public_subscriptions_token_hash_unique").on(table.managementTokenHash),
  index("public_subscriptions_active_idx").on(table.active),
]);

export const insertPublicSubscriptionSchema = createInsertSchema(publicSubscriptionsTable).omit({
  id: true,
  active: true,
  deliverySuppression: true,
  deliverySuppressedAt: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPublicSubscription = z.infer<typeof insertPublicSubscriptionSchema>;
export type PublicSubscription = typeof publicSubscriptionsTable.$inferSelect;