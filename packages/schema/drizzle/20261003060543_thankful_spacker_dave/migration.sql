CREATE TABLE `lawyer_requests` (
	`id` text PRIMARY KEY,
	`lawyer_id` text NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`preferred_time` text NOT NULL,
	`mode` text,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_lawyer_requests_lawyer_id_lawyers_id_fk` FOREIGN KEY (`lawyer_id`) REFERENCES `lawyers`(`id`),
	CONSTRAINT `fk_lawyer_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `lawyer_requests_user_created_idx` ON `lawyer_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `lawyer_requests_lawyer_idx` ON `lawyer_requests` (`lawyer_id`);--> statement-breakpoint
ALTER TABLE `lawyers` DROP COLUMN `booking_url`;