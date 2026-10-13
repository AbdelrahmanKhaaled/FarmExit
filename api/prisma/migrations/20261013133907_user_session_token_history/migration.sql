-- CreateTable
CREATE TABLE `user_session_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `session_id` BIGINT NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `consumed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_session_tokens_session_id_token_hash_key`(`session_id`, `token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_session_tokens` ADD CONSTRAINT `user_session_tokens_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `user_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
