-- Workspace SaaS migration
-- 1. Create workspace_member_role enum
DO $$ BEGIN
  CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Create workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "workspaces_slug_idx" ON "workspaces" USING btree ("slug");
--> statement-breakpoint

-- 3. Create workspace_members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");
--> statement-breakpoint

-- 4. Add workspace_id to calls (nullable initially for backfill)
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
--> statement-breakpoint

-- 5. Create default workspace and backfill calls
INSERT INTO "workspaces" ("name", "slug", "metadata")
SELECT 'Default', 'default', NULL
WHERE NOT EXISTS (SELECT 1 FROM "workspaces" WHERE slug = 'default');
--> statement-breakpoint

UPDATE "calls" SET "workspace_id" = (SELECT id FROM "workspaces" WHERE slug = 'default' LIMIT 1)
WHERE "workspace_id" IS NULL;
--> statement-breakpoint

-- Set default for any remaining nulls (new rows before FK)
UPDATE "calls" SET "workspace_id" = COALESCE(
  (SELECT id FROM "workspaces" WHERE slug = 'default' LIMIT 1),
  1
) WHERE "workspace_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "calls" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "calls" ADD CONSTRAINT "calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "calls_workspace_id_idx" ON "calls" USING btree ("workspace_id");
--> statement-breakpoint

-- 6. Add workspace_id to prompts (nullable for global prompts)
ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
--> statement-breakpoint

ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "prompts_workspace_id_idx" ON "prompts" USING btree ("workspace_id");
--> statement-breakpoint

-- 7. Add workspace_id to activity_log (nullable)
ALTER TABLE "activity_log" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
--> statement-breakpoint

ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "activity_log_workspace_id_idx" ON "activity_log" USING btree ("workspace_id");
--> statement-breakpoint

-- 8. Add existing auth users to default workspace as owners
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT (SELECT id FROM "workspaces" WHERE slug = 'default' LIMIT 1), u.id, 'owner'
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_members" wm
  JOIN "workspaces" w ON w.id = wm.workspace_id AND w.slug = 'default'
  WHERE wm.user_id = u.id
);
