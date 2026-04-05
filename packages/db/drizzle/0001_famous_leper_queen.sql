-- Pre-migration validation queries (run these before applying the migration to check for violations):
--
-- 1. Check for calls with invalid transcription_status values:
--    SELECT id, transcription_status FROM calls
--    WHERE transcription_status IS NOT NULL
--    AND transcription_status NOT IN ('pending', 'processing', 'completed', 'failed');
--
-- 2. Check for invitations with email type but NULL email:
--    SELECT id, invitation_type, email FROM invitations
--    WHERE invitation_type = 'email' AND email IS NULL;
--
-- If any rows are returned, fix or delete them before running this migration.
-- For a two-phase migration approach: add constraints as NOT VALID, then validate separately.

ALTER TABLE "calls" ADD CONSTRAINT "calls_transcription_status_check" CHECK (transcription_status IS NULL OR transcription_status IN ('pending', 'processing', 'completed', 'failed'));--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_email_type_check" CHECK (invitation_type <> 'email' OR email IS NOT NULL);