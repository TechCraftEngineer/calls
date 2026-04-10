ALTER TABLE "workspaces" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "is_onboarded" boolean DEFAULT false NOT NULL;