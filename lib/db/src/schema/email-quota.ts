import { pgTable, text, jsonb, integer, timestamp, index, primaryKey } from "drizzle-orm/pg-core";

// No recipient addresses, message payloads, API keys or raw provider errors.
export const emailQuotaAccountsTable = pgTable("email_quota_accounts", {
  id: text("id").primaryKey(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
});

export const emailReservationsTable = pgTable("email_reservations", {
  account: text("account").notNull().references(() => emailQuotaAccountsTable.id),
  id: text("id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  count: integer("count").notNull(),
  status: text("status").notNull(),
  reference: text("reference"),
  dailyReset: text("daily_reset").notNull(),
  monthlyReset: text("monthly_reset").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, table => [
  primaryKey({ columns: [table.account, table.id] }),
  index("email_reservations_account_windows").on(table.account, table.monthlyReset),
  index("email_reservations_unresolved").on(table.account, table.status),
]);
