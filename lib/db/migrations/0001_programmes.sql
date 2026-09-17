CREATE TYPE "programme_status" AS ENUM ('draft', 'published', 'closed', 'archived');
CREATE TYPE "programme_section" AS ENUM ('about', 'placement', 'training', 'eligibility', 'timeline', 'application_guidance');
CREATE TABLE "programmes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "num" text NOT NULL,
  "card_title" text NOT NULL,
  "card_copy" text NOT NULL,
  "card_cta" text NOT NULL,
  "image" text NOT NULL,
  "title" text NOT NULL,
  "short_description" text NOT NULL,
  "status" "programme_status" NOT NULL DEFAULT 'draft',
  "application_status" text NOT NULL,
  "application_deadline" text,
  "deadline" timestamptz,
  "location" text NOT NULL,
  "application_url" text,
  "featured" boolean NOT NULL DEFAULT false,
  "display_order" integer NOT NULL DEFAULT 0,
  "published_at" timestamptz,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL
);
CREATE UNIQUE INDEX "programmes_slug_unique" ON "programmes" ("slug");
CREATE INDEX "programmes_status_idx" ON "programmes" ("status");
CREATE INDEX "programmes_order_idx" ON "programmes" ("display_order");
CREATE TABLE "programme_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "programme_id" uuid NOT NULL REFERENCES "programmes"("id") ON DELETE CASCADE,
  "section" "programme_section" NOT NULL,
  "position" integer NOT NULL,
  "content" text NOT NULL
);
CREATE UNIQUE INDEX "programme_sections_order_unique" ON "programme_sections" ("programme_id", "section", "position");
CREATE INDEX "programme_sections_programme_idx" ON "programme_sections" ("programme_id");
ALTER TABLE "portal_audit_events" ADD COLUMN "programme_id" uuid REFERENCES "programmes"("id") ON DELETE SET NULL;
CREATE INDEX "portal_audit_events_programme_created_idx" ON "portal_audit_events" ("programme_id", "created_at");