-- Add enhanced_audio_file_id column to calls table
ALTER TABLE "calls" ADD COLUMN "enhanced_audio_file_id" uuid REFERENCES "files"("id") ON DELETE SET NULL;

-- Add index for enhanced_audio_file_id
CREATE INDEX IF NOT EXISTS "calls_enhanced_audio_file_id_idx" ON "calls" ("enhanced_audio_file_id");
