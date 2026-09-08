import {
  boolean,
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

export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "draft",
  "published",
  "closed",
  "filled",
  "archived",
]);
export const opportunityContentSectionEnum = pgEnum("opportunity_content_section", [
  "responsibility",
  "essential",
  "desired",
]);

export const opportunitiesTable = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: opportunityStatusEnum("status").notNull().default("draft"),
    publicationLabel: text("publication_label").notNull(),
    department: text("department").notNull(),
    roleType: text("role_type").notNull(),
    summary: text("summary").notNull(),
    applicationDeadline: text("application_deadline").notNull(),
    responseDate: text("response_date"),
    applicationUrl: text("application_url"),
    deadline: timestamp("deadline", { withTimezone: true }),
    deadlineExtended: boolean("deadline_extended").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    urgent: boolean("urgent").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("opportunities_slug_unique").on(table.slug),
    index("opportunities_status_idx").on(table.status),
    index("opportunities_updated_at_idx").on(table.updatedAt),
    index("opportunities_deadline_idx").on(table.deadline),
  ],
);

export const opportunityContentItemsTable = pgTable(
  "opportunity_content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunitiesTable.id, { onDelete: "cascade" }),
    section: opportunityContentSectionEnum("section").notNull(),
    position: integer("position").notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_content_order_unique").on(
      table.opportunityId,
      table.section,
      table.position,
    ),
    index("opportunity_content_opportunity_idx").on(table.opportunityId),
  ],
);

export const opportunityDetailsTable = pgTable(
  "opportunity_details",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunitiesTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    uniqueIndex("opportunity_details_order_unique").on(table.opportunityId, table.position),
    index("opportunity_details_opportunity_idx").on(table.opportunityId),
  ],
);

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({
  id: true, createdAt: true, updatedAt: true, publishedAt: true, archivedAt: true,
});
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;