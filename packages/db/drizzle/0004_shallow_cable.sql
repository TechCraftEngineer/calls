ALTER TABLE "invitations" ADD COLUMN "pending_settings" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "invitation_token" text;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "invitation_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "invited_by" text;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_members_status_idx" ON "workspace_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_members_invitation_token_idx" ON "workspace_members" USING btree ("invitation_token");