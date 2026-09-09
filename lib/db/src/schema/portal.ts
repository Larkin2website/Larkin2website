import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalRoleEnum = pgEnum("portal_role", [
  "super_admin",
  "opportunity_manager",
  "viewer",
]);

export const portalMembershipsTable = pgTable(
  "portal_memberships",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    role: portalRoleEnum("role").notNull().default("viewer"),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("portal_memberships_active_idx").on(table.active)],
);

export const portalAccessGrantsTable = pgTable(
  "portal_access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    claimedUserId: text("claimed_user_id"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    role: portalRoleEnum("role").notNull().default("viewer"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("portal_access_grants_active_idx").on(table.active),
    uniqueIndex("portal_access_grants_normalized_email_unique").on(table.normalizedEmail),
  ],
);

export const auditEventsTable = pgTable(
  "portal_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id"),
    action: text("action").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    actorName: text("actor_name").notNull(),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("portal_audit_events_opportunity_created_idx").on(table.opportunityId, table.createdAt),
    index("portal_audit_events_created_idx").on(table.createdAt),
  ],
);

export const insertPortalMembershipSchema = createInsertSchema(portalMembershipsTable).omit({
  createdAt: true, updatedAt: true,
});
export type InsertPortalMembership = z.infer<typeof insertPortalMembershipSchema>;
export type PortalMembership = typeof portalMembershipsTable.$inferSelect;
export const insertPortalAccessGrantSchema = createInsertSchema(portalAccessGrantsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertPortalAccessGrant = z.infer<typeof insertPortalAccessGrantSchema>;
export type PortalAccessGrant = typeof portalAccessGrantsTable.$inferSelect;
export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;