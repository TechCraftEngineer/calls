CREATE TABLE "workspace_pbx_employees" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"extension" text,
	"email" text,
	"first_name" text,
	"last_name" text,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_data" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_employees_workspace_provider_external_unique" UNIQUE("workspace_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"target_type" text NOT NULL,
	"target_external_id" text NOT NULL,
	"user_id" text,
	"invitation_id" uuid,
	"link_source" text DEFAULT 'manual' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"linked_by_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_links_workspace_provider_target_unique" UNIQUE("workspace_id","provider","target_type","target_external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_numbers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"employee_external_id" text,
	"phone_number" text NOT NULL,
	"extension" text,
	"label" text,
	"line_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_data" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_numbers_workspace_provider_external_unique" UNIQUE("workspace_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"cursor" text,
	"last_started_at" timestamp,
	"last_completed_at" timestamp,
	"last_successful_at" timestamp,
	"last_error" text,
	"stats" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_sync_state_workspace_provider_type_unique" UNIQUE("workspace_id","provider","sync_type")
);
--> statement-breakpoint
CREATE TABLE "workspace_pbx_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"event_id" text,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_pbx_webhook_events_workspace_provider_event_unique" UNIQUE("workspace_id","provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_pbx_employees" ADD CONSTRAINT "workspace_pbx_employees_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_links" ADD CONSTRAINT "workspace_pbx_links_linked_by_user_id_users_id_fk" FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_numbers" ADD CONSTRAINT "workspace_pbx_numbers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_sync_state" ADD CONSTRAINT "workspace_pbx_sync_state_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pbx_webhook_events" ADD CONSTRAINT "workspace_pbx_webhook_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_workspace_idx" ON "workspace_pbx_employees" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_provider_idx" ON "workspace_pbx_employees" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_extension_idx" ON "workspace_pbx_employees" USING btree ("extension");--> statement-breakpoint
CREATE INDEX "workspace_pbx_employees_email_idx" ON "workspace_pbx_employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_workspace_idx" ON "workspace_pbx_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_provider_idx" ON "workspace_pbx_links" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_user_idx" ON "workspace_pbx_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_links_invitation_idx" ON "workspace_pbx_links" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_workspace_idx" ON "workspace_pbx_numbers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_provider_idx" ON "workspace_pbx_numbers" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_phone_idx" ON "workspace_pbx_numbers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "workspace_pbx_numbers_extension_idx" ON "workspace_pbx_numbers" USING btree ("extension");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_workspace_idx" ON "workspace_pbx_sync_state" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_provider_idx" ON "workspace_pbx_sync_state" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_sync_state_status_idx" ON "workspace_pbx_sync_state" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_workspace_idx" ON "workspace_pbx_webhook_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_provider_idx" ON "workspace_pbx_webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_type_idx" ON "workspace_pbx_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "workspace_pbx_webhook_events_status_idx" ON "workspace_pbx_webhook_events" USING btree ("status");