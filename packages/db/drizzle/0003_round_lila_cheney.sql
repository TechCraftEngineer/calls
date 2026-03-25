ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_slug_unique";--> statement-breakpoint
DROP INDEX "workspaces_slug_idx";--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "enhanced_audio_file_id" uuid;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_enhanced_audio_file_id_files_id_fk" FOREIGN KEY ("enhanced_audio_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_enhanced_audio_file_id_idx" ON "calls" USING btree ("enhanced_audio_file_id");--> statement-breakpoint
ALTER TABLE "transcripts" DROP COLUMN "size_kb";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "slug";