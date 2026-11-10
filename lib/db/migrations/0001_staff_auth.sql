CREATE TABLE "staff_auth_mail" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"target_id" text,
	"email" text NOT NULL,
	"nonce" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"provider_reference" text,
	"sending_account" text,
	"last_error" text,
	CONSTRAINT "staff_auth_mail_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"normalized_email" text NOT NULL,
	"password_hash" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_credentials_normalized_email_unique" UNIQUE("normalized_email")
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_user_id_portal_memberships_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."portal_memberships"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_staff_credentials_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_credentials"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_auth_mail_queue_idx" ON "staff_auth_mail" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "staff_auth_mail_email_idx" ON "staff_auth_mail" USING btree ("email");--> statement-breakpoint
CREATE INDEX "staff_sessions_user_idx" ON "staff_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_sessions_expiry_idx" ON "staff_sessions" USING btree ("expires_at");