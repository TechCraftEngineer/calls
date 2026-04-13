ALTER TABLE "calls" ADD COLUMN "processing_status" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "processing_completed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "calls_processing_status_idx" ON "calls" USING btree ("processing_status");--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_processing_status_check" CHECK (processing_status IS NULL OR processing_status IN ('pending', 'transcribing', 'transcribed', 'evaluating', 'completed', 'failed'));