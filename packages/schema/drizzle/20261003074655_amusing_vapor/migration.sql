CREATE TABLE `user_usage` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `user_usage_pk` PRIMARY KEY(`user_id`, `date`),
	CONSTRAINT `fk_user_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_subscribed` integer DEFAULT false NOT NULL;