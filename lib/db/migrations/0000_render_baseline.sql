CREATE TYPE "public"."opportunity_content_section" AS ENUM('responsibility', 'essential', 'desired');--> statement-breakpoint
CREATE TYPE "public"."opportunity_option_kind" AS ENUM('department', 'role_type');--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('draft', 'published', 'closed', 'filled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."programme_section" AS ENUM('about', 'placement', 'training', 'eligibility', 'timeline', 'application_guidance');--> statement-breakpoint
CREATE TYPE "public"."programme_status" AS ENUM('draft', 'published', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."portal_role" AS ENUM('super_admin', 'opportunity_manager', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."audience_content_type" AS ENUM('content', 'role', 'programme', 'training');--> statement-breakpoint
CREATE TYPE "public"."crm_delivery_status" AS ENUM('pending', 'processing', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."crm_enquiry_status" AS ENUM('new', 'open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "opportunity_status" DEFAULT 'draft' NOT NULL,
	"publication_label" text NOT NULL,
	"department" text NOT NULL,
	"role_type" text NOT NULL,
	"summary" text NOT NULL,
	"accountable_to" text,
	"contract_dates_hours" text,
	"work_arrangement" text,
	"works_closely_with" text[] DEFAULT '{}' NOT NULL,
	"additional_information" text,
	"application_email" text,
	"application_closing_date" text,
	"application_closing_time" text,
	"application_instructions" text,
	"training_application_instructions" text,
	"recruitment_route" text,
	"shortlist_size" integer,
	"interview_format" text,
	"interview_dates" text,
	"technical_questions" text[] DEFAULT '{}' NOT NULL,
	"application_deadline" text NOT NULL,
	"response_date" text,
	"application_url" text,
	"deadline" timestamp with time zone,
	"deadline_extended" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"section" "opportunity_content_section" NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "opportunity_option_kind" NOT NULL,
	"label" text NOT NULL,
	"normalized_label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"section" "programme_section" NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'programme' NOT NULL,
	"registration_state" text,
	"registration_closes_on" text,
	"num" text NOT NULL,
	"card_title" text NOT NULL,
	"card_copy" text NOT NULL,
	"card_cta" text NOT NULL,
	"image" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"status" "programme_status" DEFAULT 'draft' NOT NULL,
	"application_status" text NOT NULL,
	"application_deadline" text,
	"deadline" timestamp with time zone,
	"location" text NOT NULL,
	"application_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"action" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"claimed_user_id" text,
	"claimed_at" timestamp with time zone,
	"role" "portal_role" DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_memberships" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"role" "portal_role" DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"craft" text,
	"career_level" text,
	"location" text,
	"acquisition_source" text,
	"acquisition_detail" text,
	"acquisition_detail_declined" boolean DEFAULT false NOT NULL,
	"website_purposes" text[] DEFAULT '{}' NOT NULL,
	"website_purpose_other" text,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"content_types" text[] DEFAULT '{}' NOT NULL,
	"career_levels" text[] DEFAULT '{}' NOT NULL,
	"crafts" text[] DEFAULT '{}' NOT NULL,
	"all_opportunities" boolean DEFAULT false NOT NULL,
	"consent" boolean NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"management_token_hash" char(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"delivery_suppression" text,
	"delivery_suppressed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_subscriptions_consent_true" CHECK ("public_subscriptions"."consent" = true),
	CONSTRAINT "public_subscriptions_career_level_valid" CHECK ("public_subscriptions"."career_level" is null or "public_subscriptions"."career_level" in ('new_entrant', 'mid_level', 'senior')),
	CONSTRAINT "public_subscriptions_acquisition_declined_valid" CHECK (not "public_subscriptions"."acquisition_detail_declined" or ("public_subscriptions"."acquisition_source" is not null and "public_subscriptions"."acquisition_detail" is null)),
	CONSTRAINT "public_subscriptions_website_purpose_other_valid" CHECK ("public_subscriptions"."website_purpose_other" is null or 'other' = any("public_subscriptions"."website_purposes"))
);
--> statement-breakpoint
CREATE TABLE "subscription_challenges" (
	"email" text PRIMARY KEY NOT NULL,
	"code_hash" char(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"next_request_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_sessions" (
	"token_hash" char(64) PRIMARY KEY NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_matching" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"content_type" "audience_content_type" NOT NULL,
	"career_levels" text[] DEFAULT '{}' NOT NULL,
	"crafts" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_matching_exactly_one_publication" CHECK (num_nonnulls("audience_matching"."opportunity_id", "audience_matching"."programme_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "crm_communication_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"status" "crm_delivery_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"provider_reference" text,
	"provider_failure" text,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"deferred_reason" text,
	"claim_version" integer DEFAULT 0 NOT NULL,
	"sending_account" text,
	CONSTRAINT "crm_outbox_exactly_one_publication" CHECK (num_nonnulls("crm_communication_outbox"."opportunity_id", "crm_communication_outbox"."programme_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "crm_communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" "crm_delivery_status" DEFAULT 'pending' NOT NULL,
	"subject" text,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"test_sent_at" timestamp with time zone,
	"test_provider_reference" text,
	"test_last_error" text,
	CONSTRAINT "crm_communications_exactly_one_publication" CHECK (num_nonnulls("crm_communications"."opportunity_id", "crm_communications"."programme_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "crm_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"subject" text,
	"source" text,
	"message" text NOT NULL,
	"status" "crm_enquiry_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_provider_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_reference" text NOT NULL,
	"event" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_provider_event_valid" CHECK ("crm_provider_events"."event" in ('email.delivered', 'email.bounced', 'email.complained'))
);
--> statement-breakpoint
CREATE TABLE "public_engagement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"event" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_engagement_exactly_one_publication" CHECK (num_nonnulls("public_engagement_events"."opportunity_id", "public_engagement_events"."programme_id") = 1),
	CONSTRAINT "public_engagement_event_valid" CHECK ("public_engagement_events"."event" in ('view', 'apply'))
);
--> statement-breakpoint
CREATE TABLE "temporary_test_sessions" (
	"token_hash" char(64) PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_quota_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_reservations" (
	"account" text NOT NULL,
	"id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"count" integer NOT NULL,
	"status" text NOT NULL,
	"reference" text,
	"daily_reset" text NOT NULL,
	"monthly_reset" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "email_reservations_account_id_pk" PRIMARY KEY("account","id")
);
--> statement-breakpoint
ALTER TABLE "opportunity_content_items" ADD CONSTRAINT "opportunity_content_items_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_details" ADD CONSTRAINT "opportunity_details_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_sections" ADD CONSTRAINT "programme_sections_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_sessions" ADD CONSTRAINT "subscription_sessions_subscriber_id_public_subscriptions_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."public_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_matching" ADD CONSTRAINT "audience_matching_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_matching" ADD CONSTRAINT "audience_matching_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communication_outbox" ADD CONSTRAINT "crm_communication_outbox_communication_id_crm_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."crm_communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communication_outbox" ADD CONSTRAINT "crm_communication_outbox_subscriber_id_public_subscriptions_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."public_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communication_outbox" ADD CONSTRAINT "crm_communication_outbox_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communication_outbox" ADD CONSTRAINT "crm_communication_outbox_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communications" ADD CONSTRAINT "crm_communications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_communications" ADD CONSTRAINT "crm_communications_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_engagement_events" ADD CONSTRAINT "public_engagement_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_engagement_events" ADD CONSTRAINT "public_engagement_events_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reservations" ADD CONSTRAINT "email_reservations_account_email_quota_accounts_id_fk" FOREIGN KEY ("account") REFERENCES "public"."email_quota_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_slug_unique" ON "opportunities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunities_updated_at_idx" ON "opportunities" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "opportunities_deadline_idx" ON "opportunities" USING btree ("deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_content_order_unique" ON "opportunity_content_items" USING btree ("opportunity_id","section","position");--> statement-breakpoint
CREATE INDEX "opportunity_content_opportunity_idx" ON "opportunity_content_items" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_details_order_unique" ON "opportunity_details" USING btree ("opportunity_id","position");--> statement-breakpoint
CREATE INDEX "opportunity_details_opportunity_idx" ON "opportunity_details" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_options_kind_normalized_unique" ON "opportunity_options" USING btree ("kind","normalized_label");--> statement-breakpoint
CREATE INDEX "opportunity_options_kind_label_idx" ON "opportunity_options" USING btree ("kind","label");--> statement-breakpoint
CREATE INDEX "opportunity_options_kind_active_label_idx" ON "opportunity_options" USING btree ("kind","active","label");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_sections_order_unique" ON "programme_sections" USING btree ("programme_id","section","position");--> statement-breakpoint
CREATE INDEX "programme_sections_programme_idx" ON "programme_sections" USING btree ("programme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_slug_unique" ON "programmes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "programmes_status_idx" ON "programmes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "programmes_order_idx" ON "programmes" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "portal_audit_events_opportunity_created_idx" ON "portal_audit_events" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "portal_audit_events_programme_created_idx" ON "portal_audit_events" USING btree ("programme_id","created_at");--> statement-breakpoint
CREATE INDEX "portal_audit_events_created_idx" ON "portal_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "portal_access_grants_active_idx" ON "portal_access_grants" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_access_grants_normalized_email_unique" ON "portal_access_grants" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "portal_memberships_active_idx" ON "portal_memberships" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "public_subscriptions_email_unique" ON "public_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "public_subscriptions_token_hash_unique" ON "public_subscriptions" USING btree ("management_token_hash");--> statement-breakpoint
CREATE INDEX "public_subscriptions_active_idx" ON "public_subscriptions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "subscription_sessions_subscriber_idx" ON "subscription_sessions" USING btree ("subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audience_matching_opportunity_unique" ON "audience_matching" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audience_matching_programme_unique" ON "audience_matching" USING btree ("programme_id");--> statement-breakpoint
CREATE INDEX "audience_matching_content_type_idx" ON "audience_matching" USING btree ("content_type");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_outbox_opportunity_subscriber_unique" ON "crm_communication_outbox" USING btree ("opportunity_id","subscriber_id") WHERE "crm_communication_outbox"."opportunity_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_outbox_programme_subscriber_unique" ON "crm_communication_outbox" USING btree ("programme_id","subscriber_id") WHERE "crm_communication_outbox"."programme_id" is not null;--> statement-breakpoint
CREATE INDEX "crm_outbox_status_created_idx" ON "crm_communication_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "crm_outbox_provider_reference_idx" ON "crm_communication_outbox" USING btree ("provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_communications_opportunity_unique" ON "crm_communications" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_communications_programme_unique" ON "crm_communications" USING btree ("programme_id");--> statement-breakpoint
CREATE INDEX "crm_communications_created_idx" ON "crm_communications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "crm_enquiries_status_created_idx" ON "crm_enquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "crm_provider_events_reference_idx" ON "crm_provider_events" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "public_engagement_opportunity_event_idx" ON "public_engagement_events" USING btree ("opportunity_id","event","created_at");--> statement-breakpoint
CREATE INDEX "public_engagement_programme_event_idx" ON "public_engagement_events" USING btree ("programme_id","event","created_at");--> statement-breakpoint
CREATE INDEX "temporary_test_sessions_expiry_idx" ON "temporary_test_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "email_reservations_account_windows" ON "email_reservations" USING btree ("account","monthly_reset");--> statement-breakpoint
CREATE INDEX "email_reservations_unresolved" ON "email_reservations" USING btree ("account","status");