ALTER TABLE "public_subscriptions" ADD COLUMN IF NOT EXISTS "delivery_suppression" text;
ALTER TABLE "public_subscriptions" ADD COLUMN IF NOT EXISTS "delivery_suppressed_at" timestamptz;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "provider_failure" text;
CREATE INDEX IF NOT EXISTS "crm_outbox_provider_reference_idx" ON "crm_communication_outbox" ("provider_reference");
CREATE TABLE IF NOT EXISTS "crm_provider_events" (
  "id" text PRIMARY KEY,
  "provider_reference" text NOT NULL,
  "event" text NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "crm_provider_event_valid" CHECK ("event" in ('email.delivered', 'email.bounced', 'email.complained'))
);
CREATE INDEX IF NOT EXISTS "crm_provider_events_reference_idx" ON "crm_provider_events" ("provider_reference");