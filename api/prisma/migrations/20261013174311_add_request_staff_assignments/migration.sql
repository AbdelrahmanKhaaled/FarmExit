-- CreateTable
CREATE TABLE `request_staff_assignments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT NOT NULL,
    `assignment_type` ENUM('reviewer', 'case_agent') NOT NULL,
    `assigned_staff_id` BIGINT NOT NULL,
    `assigned_by_user_id` BIGINT NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `request_staff_assignments_assigned_staff_id_idx`(`assigned_staff_id`),
    UNIQUE INDEX `request_staff_assignments_request_id_assignment_type_key`(`request_id`, `assignment_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `request_staff_assignments` ADD CONSTRAINT `request_staff_assignments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_staff_assignments` ADD CONSTRAINT `request_staff_assignments_assigned_staff_id_fkey` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_staff_assignments` ADD CONSTRAINT `request_staff_assignments_assigned_by_user_id_fkey` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
