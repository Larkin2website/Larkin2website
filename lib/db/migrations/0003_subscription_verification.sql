CREATE TABLE IF NOT EXISTS "subscription_challenges" (
  "email" text PRIMARY KEY NOT NULL,
  "code_hash" char(64) NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "window_started_at" timestamptz NOT NULL,
  "next_request_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "subscription_sessions" (
  "token_hash" char(64) PRIMARY KEY NOT NULL,
  "subscriber_id" uuid NOT NULL REFERENCES "public_subscriptions"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "subscription_sessions_subscriber_idx" ON "subscription_sessions" ("subscriber_id");