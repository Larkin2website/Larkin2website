ALTER TABLE "public_subscriptions"
  ADD COLUMN IF NOT EXISTS "website_purposes" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "public_subscriptions"
  ADD COLUMN IF NOT EXISTS "website_purpose_other" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'public_subscriptions_website_purpose_other_valid'
      AND conrelid = 'public_subscriptions'::regclass
  ) THEN
    ALTER TABLE "public_subscriptions"
      ADD CONSTRAINT "public_subscriptions_website_purpose_other_valid"
      CHECK ("website_purpose_other" IS NULL OR 'other' = ANY("website_purposes"));
  END IF;
END $$;