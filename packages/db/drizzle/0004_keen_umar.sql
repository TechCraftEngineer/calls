ALTER TABLE "files" ADD COLUMN "duration_seconds" real;

ALTER TABLE "files" ADD CONSTRAINT "chk_files_duration_seconds_finite_positive" CHECK (
  "duration_seconds" IS NULL
  OR (isfinite("duration_seconds") AND "duration_seconds" > 0)
);