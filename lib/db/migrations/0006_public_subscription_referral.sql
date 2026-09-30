ALTER TABLE "public_subscriptions"
  ADD COLUMN IF NOT EXISTS "acquisition_detail_declined" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'public_subscriptions_acquisition_declined_valid'
      AND conrelid = 'public_subscriptions'::regclass
  ) THEN
    ALTER TABLE "public_subscriptions"
      ADD CONSTRAINT "public_subscriptions_acquisition_declined_valid"
      CHECK (
        NOT "acquisition_detail_declined"
        OR ("acquisition_source" IS NOT NULL AND "acquisition_detail" IS NULL)
      );
  END IF;
END $$;