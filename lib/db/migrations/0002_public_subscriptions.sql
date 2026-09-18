CREATE TABLE "public_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "consent" boolean NOT NULL,
  "consented_at" timestamptz NOT NULL,
  "management_token_hash" char(64) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "unsubscribed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "public_subscriptions_consent_true" CHECK ("consent" = true)
);
CREATE UNIQUE INDEX "public_subscriptions_email_unique" ON "public_subscriptions" ("email");
CREATE UNIQUE INDEX "public_subscriptions_token_hash_unique" ON "public_subscriptions" ("management_token_hash");
CREATE INDEX "public_subscriptions_active_idx" ON "public_subscriptions" ("active");