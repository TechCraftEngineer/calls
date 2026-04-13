ALTER TABLE "calls" DROP CONSTRAINT "calls_processing_status_check";--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "processing_status" SET DATA TYPE "public"."processing_status";--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "processing_status" SET DEFAULT 'pending';