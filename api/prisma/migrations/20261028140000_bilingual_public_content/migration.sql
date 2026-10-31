-- REVIEW REQUIRED. Do not apply to an existing database without approval. No data backfill or machine translation.
ALTER TABLE `farms` ADD COLUMN `localized_content` JSON NULL;
ALTER TABLE `farm_listing_details` ADD COLUMN `localized_content` JSON NULL;
ALTER TABLE `farm_management_details` ADD COLUMN `localized_content` JSON NULL;
ALTER TABLE `partnership_details` ADD COLUMN `localized_content` JSON NULL;
CREATE TABLE `homepage_content` (`locale` CHAR(2) NOT NULL, `draft` JSON NOT NULL, `published` JSON NULL, `published_at` DATETIME(3) NULL, `updated_at` DATETIME(3) NOT NULL, PRIMARY KEY (`locale`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
