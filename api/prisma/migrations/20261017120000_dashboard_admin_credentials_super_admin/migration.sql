-- AlterEnum: add super_admin to staff_role
ALTER TABLE `staff_memberships` MODIFY `staff_role` ENUM('admin', 'case_agent', 'reviewer', 'super_admin') NOT NULL;

-- CreateTable
CREATE TABLE `dashboard_admin_credentials` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `email_normalized` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `password_changed_at` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dashboard_admin_credentials_user_id_key`(`user_id`),
    UNIQUE INDEX `dashboard_admin_credentials_email_normalized_key`(`email_normalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dashboard_admin_credentials` ADD CONSTRAINT `dashboard_admin_credentials_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
