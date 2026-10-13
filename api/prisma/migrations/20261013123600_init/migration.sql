-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(150) NOT NULL,
    `mobile_e164` VARCHAR(20) NOT NULL,
    `mobile_verified_at` DATETIME(3) NULL,
    `email` VARCHAR(255) NULL,
    `avatar_storage_key` VARCHAR(500) NULL,
    `account_status` ENUM('active', 'suspended', 'blocked') NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_mobile_e164_key`(`mobile_e164`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `session_token_hash` VARCHAR(128) NOT NULL,
    `device_name` VARCHAR(120) NULL,
    `user_agent` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `last_seen_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_session_token_hash_key`(`session_token_hash`),
    INDEX `user_sessions_user_id_revoked_at_expires_at_idx`(`user_id`, `revoked_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_verifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `mobile_e164` VARCHAR(20) NOT NULL,
    `purpose` ENUM('sign_in', 'registration', 'verification') NOT NULL,
    `code_hash` VARCHAR(128) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_verifications_mobile_e164_purpose_created_at_idx`(`mobile_e164`, `purpose`, `created_at`),
    INDEX `otp_verifications_user_id_purpose_created_at_idx`(`user_id`, `purpose`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_memberships` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `staff_role` ENUM('admin', 'case_agent', 'reviewer') NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `staff_memberships_user_id_staff_role_key`(`user_id`, `staff_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farms` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `farm_type` ENUM('Vegetable', 'Fruit', 'Livestock', 'Mixed') NOT NULL,
    `main_activity` VARCHAR(255) NULL,
    `area_feddan` DECIMAL(12, 2) NOT NULL,
    `governorate` VARCHAR(120) NOT NULL,
    `area_name` VARCHAR(120) NULL,
    `public_map_latitude` DECIMAL(10, 8) NULL,
    `public_map_longitude` DECIMAL(11, 8) NULL,
    `private_pin_latitude` DECIMAL(10, 8) NULL,
    `private_pin_longitude` DECIMAL(11, 8) NULL,
    `approximate_area` TEXT NULL,
    `water_source` VARCHAR(40) NULL,
    `irrigation_method` VARCHAR(40) NULL,
    `energy_source` VARCHAR(40) NULL,
    `soil_type` VARCHAR(120) NULL,
    `production_details` JSON NULL,
    `access_details` JSON NULL,
    `facilities` JSON NULL,
    `farm_status` VARCHAR(30) NOT NULL DEFAULT 'active',
    `created_by` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `farms_governorate_area_name_idx`(`governorate`, `area_name`),
    INDEX `farms_farm_type_area_feddan_idx`(`farm_type`, `area_feddan`),
    INDEX `farms_water_source_irrigation_method_energy_source_idx`(`water_source`, `irrigation_method`, `energy_source`),
    INDEX `farms_farm_status_idx`(`farm_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_relationships` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `farm_id` BIGINT NOT NULL,
    `relationship_role` ENUM('owner', 'partner', 'manager', 'agricultural_engineer', 'tenant') NOT NULL,
    `relationship_status` ENUM('active', 'pending', 'inactive') NOT NULL DEFAULT 'active',
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `farm_relationships_user_id_relationship_role_idx`(`user_id`, `relationship_role`),
    INDEX `farm_relationships_farm_id_relationship_role_idx`(`farm_id`, `relationship_role`),
    UNIQUE INDEX `farm_relationships_farm_id_user_id_relationship_role_key`(`farm_id`, `user_id`, `relationship_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_crop_types` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `farm_id` BIGINT NOT NULL,
    `crop_type` VARCHAR(80) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `farm_crop_types_crop_type_farm_id_idx`(`crop_type`, `farm_id`),
    UNIQUE INDEX `farm_crop_types_farm_id_crop_type_key`(`farm_id`, `crop_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_media` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `farm_id` BIGINT NOT NULL,
    `uploaded_by` BIGINT NOT NULL,
    `media_type` ENUM('photo', 'video', 'plan') NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `alt_en` VARCHAR(255) NULL,
    `alt_ar` VARCHAR(255) NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `focal_x` DECIMAL(5, 4) NULL,
    `focal_y` DECIMAL(5, 4) NULL,
    `is_illustrative` BOOLEAN NOT NULL DEFAULT false,
    `licence_status` VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(40) NOT NULL,
    `request_type` ENUM('farm_listing', 'farm_management', 'partnership', 'professional_verification', 'professional_application', 'partnership_application', 'farm_details', 'farm_purchase_proposal') NOT NULL,
    `created_by` BIGINT NOT NULL,
    `farm_id` BIGINT NULL,
    `parent_request_id` BIGINT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `visibility` ENUM('private', 'public') NOT NULL DEFAULT 'private',
    `current_step` SMALLINT NOT NULL DEFAULT 1,
    `submitted_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `requests_request_number_key`(`request_number`),
    INDEX `requests_request_type_status_published_at_idx`(`request_type`, `status`, `published_at`),
    INDEX `requests_created_by_created_at_idx`(`created_by`, `created_at`),
    INDEX `requests_farm_id_request_type_status_idx`(`farm_id`, `request_type`, `status`),
    INDEX `requests_parent_request_id_request_type_status_idx`(`parent_request_id`, `request_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_listing_details` (
    `request_id` BIGINT NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `listing_type` ENUM('sale', 'rent') NOT NULL,
    `asking_price` DECIMAL(15, 2) NULL,
    `annual_rent_per_feddan` DECIMAL(15, 2) NULL,
    `stated_sale_price_per_feddan` DECIMAL(15, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
    `availability` VARCHAR(60) NULL,
    `listing_description` TEXT NULL,
    `highlights` JSON NULL,
    `extra_details` JSON NULL,

    UNIQUE INDEX `farm_listing_details_slug_key`(`slug`),
    INDEX `farm_listing_details_listing_type_asking_price_idx`(`listing_type`, `asking_price`),
    INDEX `farm_listing_details_listing_type_annual_rent_per_feddan_idx`(`listing_type`, `annual_rent_per_feddan`),
    INDEX `farm_listing_details_availability_idx`(`availability`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_management_details` (
    `request_id` BIGINT NOT NULL,
    `professional_need` ENUM('farmManager', 'agriculturalEngineer', 'both') NOT NULL,
    `management_types` JSON NULL,
    `term` VARCHAR(100) NULL,
    `current_team` JSON NULL,
    `current_situation` TEXT NULL,
    `challenges` JSON NULL,
    `goals` JSON NULL,
    `outcomes` TEXT NULL,
    `responsibilities` JSON NULL,
    `experience_level` VARCHAR(30) NULL,
    `crop_expertise` JSON NULL,
    `on_site_presence` VARCHAR(100) NULL,
    `team_leadership` VARCHAR(100) NULL,
    `resources_and_facilities` JSON NULL,
    `additional_information` TEXT NULL,

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partnership_details` (
    `request_id` BIGINT NOT NULL,
    `objective` JSON NULL,
    `description` TEXT NULL,
    `accepted_partner_types` JSON NULL,
    `partner_background` JSON NULL,
    `looking_for` JSON NULL,
    `contribution_sought` JSON NULL,
    `contribution_details` TEXT NULL,
    `current_team` JSON NULL,
    `operations` TEXT NULL,
    `sales_channel` VARCHAR(255) NULL,
    `extra_information` TEXT NULL,
    `owner_documents_required` JSON NULL,

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_application_details` (
    `request_id` BIGINT NOT NULL,
    `applicant_kind` ENUM('individual', 'company') NULL,
    `professional_capability_id` BIGINT NULL,
    `application_message` TEXT NULL,
    `why_good_fit` TEXT NULL,
    `relevant_experience` TEXT NULL,
    `approach` TEXT NULL,
    `working_style` TEXT NULL,
    `additional_information` TEXT NULL,
    `company_name` VARCHAR(200) NULL,
    `company_registration_number` VARCHAR(100) NULL,
    `company_contact_name` VARCHAR(150) NULL,
    `company_contact_role` VARCHAR(100) NULL,
    `company_sector` VARCHAR(150) NULL,
    `proposal_details` JSON NULL,

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_documents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `uploaded_by` BIGINT NOT NULL,
    `slot_key` VARCHAR(60) NOT NULL,
    `document_type` VARCHAR(120) NULL,
    `original_name` VARCHAR(255) NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(120) NULL,
    `file_size_bytes` BIGINT NULL,
    `review_status` VARCHAR(30) NOT NULL DEFAULT 'uploaded',
    `reviewed_by` BIGINT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_note` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_documents_request_id_slot_key_idx`(`request_id`, `slot_key`),
    INDEX `request_documents_request_id_review_status_idx`(`request_id`, `review_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_reviews` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `reviewer_id` BIGINT NOT NULL,
    `decision` ENUM('approved', 'changes_requested', 'rejected') NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `from_status` VARCHAR(50) NULL,
    `to_status` VARCHAR(50) NOT NULL,
    `changed_by` BIGINT NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_status_history_request_id_created_at_idx`(`request_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_forwardings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `recipient_user_id` BIGINT NOT NULL,
    `forwarded_by` BIGINT NOT NULL,
    `status` ENUM('sent', 'viewed', 'decided', 'closed') NOT NULL DEFAULT 'sent',
    `owner_decision` ENUM('pending', 'accepted', 'declined') NULL,
    `decision_reason` TEXT NULL,
    `decided_by` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decided_at` DATETIME(3) NULL,

    INDEX `request_forwardings_recipient_user_id_status_idx`(`recipient_user_id`, `status`),
    UNIQUE INDEX `request_forwardings_request_id_recipient_user_id_key`(`request_id`, `recipient_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_sale_terms` (
    `listing_request_id` BIGINT NOT NULL,
    `sale_mode` ENUM('standard_cash', 'quick_sale') NOT NULL DEFAULT 'standard_cash',
    `accepts_cash_proposals` BOOLEAN NOT NULL DEFAULT true,
    `accepts_installment_proposals` BOOLEAN NOT NULL DEFAULT false,
    `accepts_exchange_proposals` BOOLEAN NOT NULL DEFAULT false,
    `exchange_preference_scope` ENUM('any', 'selected') NOT NULL DEFAULT 'any',
    `updated_at` DATETIME(3) NULL,

    INDEX `farm_sale_terms_sale_mode_accepts_installment_proposals_acce_idx`(`sale_mode`, `accepts_installment_proposals`, `accepts_exchange_proposals`),
    PRIMARY KEY (`listing_request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_exchange_preferences` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `listing_request_id` BIGINT NOT NULL,
    `asset_type` ENUM('factory', 'villa', 'apartment', 'car') NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `farm_exchange_preferences_asset_type_listing_request_id_idx`(`asset_type`, `listing_request_id`),
    UNIQUE INDEX `farm_exchange_preferences_listing_request_id_asset_type_key`(`listing_request_id`, `asset_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_purchase_proposal_details` (
    `request_id` BIGINT NOT NULL,
    `proposal_kind` ENUM('cash', 'installment', 'exchange', 'mixed', 'co_purchase') NOT NULL,
    `proposed_total_value` DECIMAL(15, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
    `requested_share_percent` DECIMAL(5, 2) NULL,
    `proposal_notes` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_purchase_proposal_components` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `proposal_request_id` BIGINT NOT NULL,
    `component_type` ENUM('cash', 'installments', 'exchange_asset') NOT NULL,
    `proposed_value` DECIMAL(15, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
    `asset_type` ENUM('factory', 'villa', 'apartment', 'car') NULL,
    `asset_description` TEXT NULL,
    `installment_count` INTEGER NULL,
    `installment_interval` VARCHAR(50) NULL,
    `component_notes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `farm_purchase_proposal_components_proposal_request_id_compon_idx`(`proposal_request_id`, `component_type`),
    INDEX `farm_purchase_proposal_components_component_type_asset_type_idx`(`component_type`, `asset_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `co_purchase_groups` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `listing_request_id` BIGINT NOT NULL,
    `assigned_staff_id` BIGINT NOT NULL,
    `target_share_percent` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `listing_asking_price_snapshot` DECIMAL(15, 2) NULL,
    `group_status` ENUM('collecting_interest', 'under_staff_followup', 'closed') NOT NULL DEFAULT 'collecting_interest',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,

    INDEX `co_purchase_groups_listing_request_id_group_status_idx`(`listing_request_id`, `group_status`),
    INDEX `co_purchase_groups_assigned_staff_id_group_status_idx`(`assigned_staff_id`, `group_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `co_purchase_group_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `group_id` BIGINT NOT NULL,
    `buyer_proposal_request_id` BIGINT NOT NULL,
    `proposed_share_percent` DECIMAL(5, 2) NOT NULL,
    `proposed_contribution_value` DECIMAL(15, 2) NULL,
    `member_status` ENUM('candidate', 'shortlisted', 'withdrawn', 'archived') NOT NULL DEFAULT 'candidate',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `co_purchase_group_members_group_id_member_status_idx`(`group_id`, `member_status`),
    INDEX `co_purchase_group_members_buyer_proposal_request_id_idx`(`buyer_proposal_request_id`),
    UNIQUE INDEX `co_purchase_group_members_group_id_buyer_proposal_request_id_key`(`group_id`, `buyer_proposal_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_evaluations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `farm_id` BIGINT NOT NULL,
    `listing_request_id` BIGINT NULL,
    `reviewed_by` BIGINT NOT NULL,
    `approved_by` BIGINT NULL,
    `score_value` DECIMAL(7, 2) NULL,
    `score_max` DECIMAL(7, 2) NULL,
    `methodology_name` VARCHAR(150) NULL,
    `methodology_version` VARCHAR(60) NULL,
    `review_scope_en` TEXT NULL,
    `review_scope_ar` TEXT NULL,
    `public_summary_en` TEXT NULL,
    `public_summary_ar` TEXT NULL,
    `internal_notes` TEXT NULL,
    `status` ENUM('draft', 'in_review', 'approved', 'published', 'withdrawn', 'superseded') NOT NULL DEFAULT 'draft',
    `reviewed_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `farm_evaluations_farm_id_status_published_at_idx`(`farm_id`, `status`, `published_at`),
    INDEX `farm_evaluations_listing_request_id_status_idx`(`listing_request_id`, `status`),
    INDEX `farm_evaluations_reviewed_by_created_at_idx`(`reviewed_by`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_evaluation_checks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `evaluation_id` BIGINT NOT NULL,
    `check_key` VARCHAR(120) NOT NULL,
    `check_status` ENUM('not_reviewed', 'reviewed', 'needs_information') NOT NULL DEFAULT 'not_reviewed',
    `evidence_document_id` BIGINT NULL,
    `reviewer_notes` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,

    UNIQUE INDEX `farm_evaluation_checks_evaluation_id_check_key_key`(`evaluation_id`, `check_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_profiles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `headline` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `base_governorate` VARCHAR(120) NULL,
    `years_experience` SMALLINT NULL,
    `experience_summary` TEXT NULL,
    `working_preferences` JSON NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `professional_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_capabilities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `professional_profile_id` BIGINT NOT NULL,
    `professional_type` ENUM('farm_manager', 'agricultural_engineer') NOT NULL,
    `verification_status` ENUM('verification_required', 'draft', 'under_review', 'changes_requested', 'verified', 'not_approved') NOT NULL DEFAULT 'verification_required',
    `verified_at` DATETIME(3) NULL,
    `not_approved_reason` TEXT NULL,

    UNIQUE INDEX `professional_capabilities_professional_profile_id_profession_key`(`professional_profile_id`, `professional_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_expertise` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `professional_capability_id` BIGINT NOT NULL,
    `expertise_type` VARCHAR(80) NOT NULL,
    `expertise_value` VARCHAR(150) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `professional_expertise_professional_capability_id_expertise__key`(`professional_capability_id`, `expertise_type`, `expertise_value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_service_areas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `professional_capability_id` BIGINT NOT NULL,
    `governorate` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `professional_service_areas_professional_capability_id_govern_key`(`professional_capability_id`, `governorate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_verification_details` (
    `request_id` BIGINT NOT NULL,
    `professional_capability_id` BIGINT NOT NULL,
    `profile_snapshot` JSON NOT NULL,
    `verification_summary` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_cases` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `assigned_staff_id` BIGINT NOT NULL,
    `status` ENUM('open', 'waiting_customer', 'waiting_owner', 'closed') NOT NULL DEFAULT 'open',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    INDEX `communication_cases_request_id_status_idx`(`request_id`, `status`),
    INDEX `communication_cases_assigned_staff_id_status_idx`(`assigned_staff_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `case_id` BIGINT NOT NULL,
    `external_user_id` BIGINT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    UNIQUE INDEX `conversations_case_id_external_user_id_key`(`case_id`, `external_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `body` TEXT NULL,
    `sent_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `messages_conversation_id_sent_at_idx`(`conversation_id`, `sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_relays` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `source_message_id` BIGINT NOT NULL,
    `relayed_message_id` BIGINT NOT NULL,
    `relayed_by` BIGINT NOT NULL,
    `relay_note` TEXT NULL,
    `relayed_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `message_relays_relayed_message_id_key`(`relayed_message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `message_id` BIGINT NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(120) NULL,
    `file_size_bytes` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_reads` (
    `message_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `read_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`message_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `item_type` ENUM('farm', 'management_opportunity', 'partnership_opportunity') NOT NULL,
    `target_key` VARCHAR(100) NOT NULL,
    `farm_id` BIGINT NULL,
    `opportunity_request_id` BIGINT NULL,
    `saved_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `saved_items_user_id_farm_id_idx`(`user_id`, `farm_id`),
    INDEX `saved_items_user_id_opportunity_request_id_idx`(`user_id`, `opportunity_request_id`),
    INDEX `saved_items_user_id_item_type_saved_at_idx`(`user_id`, `item_type`, `saved_at`),
    UNIQUE INDEX `saved_items_user_id_target_key_key`(`user_id`, `target_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_visits` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `farm_id` BIGINT NOT NULL,
    `arranged_by` BIGINT NOT NULL,
    `visitor_user_id` BIGINT NOT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `status` ENUM('proposed', 'scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'proposed',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_outcomes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `recorded_by` BIGINT NOT NULL,
    `outcome_type` ENUM('sale_completed_off_platform', 'rent_completed_off_platform', 'no_deal', 'withdrawn', 'other') NOT NULL,
    `confirmation_status` ENUM('reported', 'confirmed', 'disputed', 'corrected') NOT NULL DEFAULT 'reported',
    `occurred_at` DATETIME(3) NULL,
    `recorded_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmed_by` BIGINT NULL,
    `confirmed_at` DATETIME(3) NULL,
    `internal_notes` TEXT NULL,
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `request_outcomes_request_id_key`(`request_id`),
    INDEX `request_outcomes_outcome_type_recorded_at_idx`(`outcome_type`, `recorded_at`),
    INDEX `request_outcomes_confirmation_status_recorded_at_idx`(`confirmation_status`, `recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agricultural_facilities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `owner_user_id` BIGINT NOT NULL,
    `farm_id` BIGINT NULL,
    `facility_type` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `governorate` VARCHAR(120) NULL,
    `area_name` VARCHAR(120) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `capacity_details` JSON NULL,
    `services` JSON NULL,
    `status` ENUM('draft', 'under_review', 'approved', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facility_media` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `facility_id` BIGINT NOT NULL,
    `uploaded_by` BIGINT NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `media_type` VARCHAR(30) NOT NULL DEFAULT 'photo',
    `alt_en` VARCHAR(255) NULL,
    `alt_ar` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `licence_status` VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `request_id` BIGINT NULL,
    `notification_type` VARCHAR(60) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NULL,
    `actionable` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
    INDEX `notifications_request_id_idx`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actor_user_id` BIGINT NULL,
    `entity_type` VARCHAR(80) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `changes` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    INDEX `audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_verifications` ADD CONSTRAINT `otp_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_memberships` ADD CONSTRAINT `staff_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farms` ADD CONSTRAINT `farms_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_relationships` ADD CONSTRAINT `farm_relationships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_relationships` ADD CONSTRAINT `farm_relationships_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_crop_types` ADD CONSTRAINT `farm_crop_types_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_media` ADD CONSTRAINT `farm_media_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_media` ADD CONSTRAINT `farm_media_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_parent_request_id_fkey` FOREIGN KEY (`parent_request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_listing_details` ADD CONSTRAINT `farm_listing_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_management_details` ADD CONSTRAINT `farm_management_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_details` ADD CONSTRAINT `partnership_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_application_details` ADD CONSTRAINT `request_application_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_application_details` ADD CONSTRAINT `request_application_details_professional_capability_id_fkey` FOREIGN KEY (`professional_capability_id`) REFERENCES `professional_capabilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_documents` ADD CONSTRAINT `request_documents_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_documents` ADD CONSTRAINT `request_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_documents` ADD CONSTRAINT `request_documents_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_reviews` ADD CONSTRAINT `request_reviews_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_reviews` ADD CONSTRAINT `request_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_forwardings` ADD CONSTRAINT `request_forwardings_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_forwardings` ADD CONSTRAINT `request_forwardings_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_forwardings` ADD CONSTRAINT `request_forwardings_forwarded_by_fkey` FOREIGN KEY (`forwarded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_forwardings` ADD CONSTRAINT `request_forwardings_decided_by_fkey` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_sale_terms` ADD CONSTRAINT `farm_sale_terms_listing_request_id_fkey` FOREIGN KEY (`listing_request_id`) REFERENCES `farm_listing_details`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_exchange_preferences` ADD CONSTRAINT `farm_exchange_preferences_listing_request_id_fkey` FOREIGN KEY (`listing_request_id`) REFERENCES `farm_sale_terms`(`listing_request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_purchase_proposal_details` ADD CONSTRAINT `farm_purchase_proposal_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_purchase_proposal_components` ADD CONSTRAINT `farm_purchase_proposal_components_proposal_request_id_fkey` FOREIGN KEY (`proposal_request_id`) REFERENCES `farm_purchase_proposal_details`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_purchase_groups` ADD CONSTRAINT `co_purchase_groups_listing_request_id_fkey` FOREIGN KEY (`listing_request_id`) REFERENCES `farm_sale_terms`(`listing_request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_purchase_groups` ADD CONSTRAINT `co_purchase_groups_assigned_staff_id_fkey` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_purchase_group_members` ADD CONSTRAINT `co_purchase_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `co_purchase_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_purchase_group_members` ADD CONSTRAINT `co_purchase_group_members_buyer_proposal_request_id_fkey` FOREIGN KEY (`buyer_proposal_request_id`) REFERENCES `farm_purchase_proposal_details`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluations` ADD CONSTRAINT `farm_evaluations_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluations` ADD CONSTRAINT `farm_evaluations_listing_request_id_fkey` FOREIGN KEY (`listing_request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluations` ADD CONSTRAINT `farm_evaluations_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluations` ADD CONSTRAINT `farm_evaluations_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluation_checks` ADD CONSTRAINT `farm_evaluation_checks_evaluation_id_fkey` FOREIGN KEY (`evaluation_id`) REFERENCES `farm_evaluations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_evaluation_checks` ADD CONSTRAINT `farm_evaluation_checks_evidence_document_id_fkey` FOREIGN KEY (`evidence_document_id`) REFERENCES `request_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_profiles` ADD CONSTRAINT `professional_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_capabilities` ADD CONSTRAINT `professional_capabilities_professional_profile_id_fkey` FOREIGN KEY (`professional_profile_id`) REFERENCES `professional_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_expertise` ADD CONSTRAINT `professional_expertise_professional_capability_id_fkey` FOREIGN KEY (`professional_capability_id`) REFERENCES `professional_capabilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_service_areas` ADD CONSTRAINT `professional_service_areas_professional_capability_id_fkey` FOREIGN KEY (`professional_capability_id`) REFERENCES `professional_capabilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_verification_details` ADD CONSTRAINT `professional_verification_details_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_verification_details` ADD CONSTRAINT `professional_verification_details_professional_capability_i_fkey` FOREIGN KEY (`professional_capability_id`) REFERENCES `professional_capabilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_cases` ADD CONSTRAINT `communication_cases_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_cases` ADD CONSTRAINT `communication_cases_assigned_staff_id_fkey` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `communication_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_external_user_id_fkey` FOREIGN KEY (`external_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_relays` ADD CONSTRAINT `message_relays_source_message_id_fkey` FOREIGN KEY (`source_message_id`) REFERENCES `messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_relays` ADD CONSTRAINT `message_relays_relayed_message_id_fkey` FOREIGN KEY (`relayed_message_id`) REFERENCES `messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_relays` ADD CONSTRAINT `message_relays_relayed_by_fkey` FOREIGN KEY (`relayed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_items` ADD CONSTRAINT `saved_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_items` ADD CONSTRAINT `saved_items_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_items` ADD CONSTRAINT `saved_items_opportunity_request_id_fkey` FOREIGN KEY (`opportunity_request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits` ADD CONSTRAINT `site_visits_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits` ADD CONSTRAINT `site_visits_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits` ADD CONSTRAINT `site_visits_arranged_by_fkey` FOREIGN KEY (`arranged_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits` ADD CONSTRAINT `site_visits_visitor_user_id_fkey` FOREIGN KEY (`visitor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_outcomes` ADD CONSTRAINT `request_outcomes_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_outcomes` ADD CONSTRAINT `request_outcomes_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_outcomes` ADD CONSTRAINT `request_outcomes_confirmed_by_fkey` FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agricultural_facilities` ADD CONSTRAINT `agricultural_facilities_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agricultural_facilities` ADD CONSTRAINT `agricultural_facilities_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facility_media` ADD CONSTRAINT `facility_media_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `agricultural_facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facility_media` ADD CONSTRAINT `facility_media_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
