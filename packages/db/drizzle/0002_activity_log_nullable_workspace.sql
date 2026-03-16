-- Remove system workspace if it was created by previous migration
DELETE FROM "workspaces" WHERE "id" = 'system';
--> statement-breakpoint
-- Allow activity_log without workspace (for user creation, password updates, etc.)
ALTER TABLE "activity_log" ALTER COLUMN "workspace_id" DROP NOT NULL;
