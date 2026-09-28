import { char, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const temporaryTestSessionsTable = pgTable("temporary_test_sessions", {
  tokenHash: char("token_hash", { length: 64 }).primaryKey(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, table => [index("temporary_test_sessions_expiry_idx").on(table.expiresAt)]);

export const insertTemporaryTestSessionSchema = createInsertSchema(temporaryTestSessionsTable);
export type InsertTemporaryTestSession = z.infer<typeof insertTemporaryTestSessionSchema>;
export type TemporaryTestSession = typeof temporaryTestSessionsTable.$inferSelect;