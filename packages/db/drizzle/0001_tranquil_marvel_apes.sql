CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_workspace_key_unique" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
ALTER TABLE "prompts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "prompts" CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_settings_key_idx" ON "workspace_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "workspace_settings_workspace_idx" ON "workspace_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_calls_workspaceId_name_internalNumber" ON "calls" USING btree ("workspace_id","name","internal_number");