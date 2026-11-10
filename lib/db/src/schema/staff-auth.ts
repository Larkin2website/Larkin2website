import { pgTable, text, timestamp, integer, index, uuid } from "drizzle-orm/pg-core";
import { portalMembershipsTable } from "./portal";

export const staffCredentialsTable = pgTable("staff_credentials", {
  userId: text("user_id").primaryKey().references(() => portalMembershipsTable.userId),
  normalizedEmail: text("normalized_email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const staffSessionsTable = pgTable("staff_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => staffCredentialsTable.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => [index("staff_sessions_user_idx").on(t.userId), index("staff_sessions_expiry_idx").on(t.expiresAt)]);
// All reset requests enter the same queue, including unknown addresses. Account
// existence and provider timing therefore cannot change the request response.
export const staffAuthMailTable = pgTable("staff_auth_mail", {
  id: uuid("id").primaryKey(),
  kind: text("kind").notNull(),
  targetId: text("target_id"),
  email: text("email").notNull(),
  nonce: text("nonce").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  providerReference: text("provider_reference"),
  sendingAccount: text("sending_account"),
  lastError: text("last_error"),
}, t => [index("staff_auth_mail_queue_idx").on(t.status, t.nextAttemptAt), index("staff_auth_mail_email_idx").on(t.email)]);
