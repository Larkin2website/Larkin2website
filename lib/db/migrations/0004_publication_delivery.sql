ALTER TYPE "crm_delivery_status" ADD VALUE IF NOT EXISTS 'processing';
ALTER TABLE "crm_communications" ADD COLUMN IF NOT EXISTS "test_sent_at" timestamptz;
ALTER TABLE "crm_communications" ADD COLUMN IF NOT EXISTS "test_provider_reference" text;
ALTER TABLE "crm_communications" ADD COLUMN IF NOT EXISTS "test_last_error" text;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "first_attempt_at" timestamptz;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;
ALTER TABLE "crm_communication_outbox" ADD COLUMN IF NOT EXISTS "lease_until" timestamptz;