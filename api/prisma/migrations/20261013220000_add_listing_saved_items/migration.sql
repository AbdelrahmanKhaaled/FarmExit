-- Additive: a user can save one published listing without changing farm or opportunity bookmarks.
-- Reviewed against an empty saved_items table and no fractional listing prices.

-- AlterTable
ALTER TABLE `saved_items`
  MODIFY `item_type` ENUM('farm', 'management_opportunity', 'partnership_opportunity', 'listing') NOT NULL,
  ADD COLUMN `listing_request_id` BIGINT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `saved_items_user_id_listing_request_id_key` ON `saved_items`(`user_id`, `listing_request_id`);

-- AddForeignKey
ALTER TABLE `saved_items`
  ADD CONSTRAINT `saved_items_listing_request_id_fkey`
  FOREIGN KEY (`listing_request_id`) REFERENCES `requests`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- MySQL error 3823: farm_id and opportunity_request_id cannot appear in a CHECK
-- because their foreign keys use ON DELETE SET NULL. Those actions stay as they are.
-- Listing rows are still unique per user, and the save path writes exactly one target.
