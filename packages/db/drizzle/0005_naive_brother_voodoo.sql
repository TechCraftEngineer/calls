CREATE TYPE "public"."processing_status" AS ENUM ('pending', 'transcribing', 'transcribed', 'evaluating', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "calls" DROP CONSTRAINT IF EXISTS "calls_processing_status_check";--> statement-breakpoint
UPDATE "calls" SET "processing_status" = 'pending' WHERE "processing_status" IS NULL;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "processing_status" SET DATA TYPE "public"."processing_status" USING "processing_status"::text::processing_status;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "processing_status" SET DEFAULT 'pending';