import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const programmeStatusEnum = pgEnum("programme_status", ["draft", "published", "closed", "archived"]);
export const programmeSectionEnum = pgEnum("programme_section", [
  "about", "placement", "training", "eligibility", "timeline", "application_guidance",
]);

export const programmesTable = pgTable("programmes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  num: text("num").notNull(),
  cardTitle: text("card_title").notNull(),
  cardCopy: text("card_copy").notNull(),
  cardCta: text("card_cta").notNull(),
  image: text("image").notNull(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull(),
  status: programmeStatusEnum("status").notNull().default("draft"),
  applicationStatus: text("application_status").notNull(),
  applicationDeadline: text("application_deadline"),
  deadline: timestamp("deadline", { withTimezone: true }),
  location: text("location").notNull(),
  applicationUrl: text("application_url"),
  featured: boolean("featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
}, (table) => [
  uniqueIndex("programmes_slug_unique").on(table.slug),
  index("programmes_status_idx").on(table.status),
  index("programmes_order_idx").on(table.displayOrder),
]);

export const programmeSectionsTable = pgTable("programme_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  programmeId: uuid("programme_id").notNull().references(() => programmesTable.id, { onDelete: "cascade" }),
  section: programmeSectionEnum("section").notNull(),
  position: integer("position").notNull(),
  content: text("content").notNull(),
}, (table) => [
  uniqueIndex("programme_sections_order_unique").on(table.programmeId, table.section, table.position),
  index("programme_sections_programme_idx").on(table.programmeId),
]);

export type Programme = typeof programmesTable.$inferSelect;
export type ProgrammeSection = typeof programmeSectionsTable.$inferSelect;