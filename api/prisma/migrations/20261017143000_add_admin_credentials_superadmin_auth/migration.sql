-- Rename interim dashboard credentials table to approved admin_credentials shape.
RENAME TABLE `dashboard_admin_credentials` TO `admin_credentials`;

ALTER TABLE `admin_credentials`
    CHANGE COLUMN `email_normalized` `email` VARCHAR(255) NOT NULL,
    ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT true AFTER `is_active`,
    ADD COLUMN `last_login_at` DATETIME(3) NULL AFTER `locked_until`;

-- Session audience: existing rows remain website-scoped.
ALTER TABLE `user_sessions`
    ADD COLUMN `auth_audience` ENUM('website', 'dashboard') NOT NULL DEFAULT 'website' AFTER `user_id`;
