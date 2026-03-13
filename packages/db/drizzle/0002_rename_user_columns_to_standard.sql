-- Rename legacy columns to standard names (OIDC + domain)
-- Required for schema.users (storage) - run if you have first_name, internal_numbers etc.
ALTER TABLE "users" RENAME COLUMN "first_name" TO "given_name";
ALTER TABLE "users" RENAME COLUMN "last_name" TO "family_name";
ALTER TABLE "users" RENAME COLUMN "internal_numbers" TO "internal_extensions";
ALTER TABLE "users" RENAME COLUMN "mobile_numbers" TO "mobile_phones";
