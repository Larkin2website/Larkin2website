import { integer, pgTable, text, timestamp, uuid, char, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { publicSubscriptionsTable } from "./public-subscriptions";

export const subscriptionChallengesTable = pgTable("subscription_challenges", {
  email: text("email").primaryKey(),
  codeHash: char("code_hash", { length: 64 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  requestCount: integer("request_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  nextRequestAt: timestamp("next_request_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const subscriptionSessionsTable = pgTable("subscription_sessions", {
  tokenHash: char("token_hash", { length: 64 }).primaryKey(),
  subscriberId: uuid("subscriber_id").notNull().references(() => publicSubscriptionsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, table => [index("subscription_sessions_subscriber_idx").on(table.subscriberId)]);

export const insertSubscriptionChallengeSchema = createInsertSchema(subscriptionChallengesTable);
export type InsertSubscriptionChallenge = z.infer<typeof insertSubscriptionChallengeSchema>;
export const insertSubscriptionSessionSchema = createInsertSchema(subscriptionSessionsTable);
export type InsertSubscriptionSession = z.infer<typeof insertSubscriptionSessionSchema>;