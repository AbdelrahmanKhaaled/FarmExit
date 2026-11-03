-- Explicit owner authorization. Existing requests remain without consent; never infer or backfill it.
ALTER TABLE `farm_management_details` ADD COLUMN `publication_consent_at` DATETIME(3) NULL;
