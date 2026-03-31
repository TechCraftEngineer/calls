ALTER TABLE "calls" DROP CONSTRAINT "calls_pbx_number_id_workspace_pbx_numbers_id_fk";
--> statement-breakpoint
DROP INDEX "calls_pbx_number_id_idx";--> statement-breakpoint
ALTER TABLE "calls" DROP COLUMN "pbx_number_id";