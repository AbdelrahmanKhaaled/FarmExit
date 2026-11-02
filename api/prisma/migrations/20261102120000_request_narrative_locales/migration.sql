-- Additive, nullable translations. No data rewrite or automatic translation.
ALTER TABLE `professional_verification_details` ADD COLUMN `localized_content` JSON NULL;
ALTER TABLE `farm_purchase_proposal_details` ADD COLUMN `localized_content` JSON NULL;
