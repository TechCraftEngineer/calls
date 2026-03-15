CREATE TABLE "evaluation_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_templates_workspace_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
ALTER TABLE "evaluation_templates" ADD CONSTRAINT "evaluation_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluation_templates_workspace_idx" ON "evaluation_templates" USING btree ("workspace_id");