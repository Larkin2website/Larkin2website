import { sql } from "drizzle-orm";
import { boolean, char, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publicSubscriptionsTable = pgTable("public_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  consent: boolean("consent").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  managementTokenHash: char("management_token_hash", { length: 64 }).notNull(),
  active: boolean("active").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("public_subscriptions_consent_true", sql`${table.consent} = true`),
  uniqueIndex("public_subscriptions_email_unique").on(table.email),
  uniqueIndex("public_subscriptions_token_hash_unique").on(table.managementTokenHash),
  index("public_subscriptions_active_idx").on(table.active),
]);

export const insertPublicSubscriptionSchema = createInsertSchema(publicSubscriptionsTable).omit({
  id: true,
  active: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPublicSubscription = z.infer<typeof insertPublicSubscriptionSchema>;
export type PublicSubscription = typeof publicSubscriptionsTable.$inferSelect;