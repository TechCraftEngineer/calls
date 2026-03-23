ALTER TABLE "calls" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_workspace_provider_external_id_unique" UNIQUE("workspace_id","provider","external_id");