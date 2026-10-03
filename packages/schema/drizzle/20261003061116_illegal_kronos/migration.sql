CREATE TABLE `support_ticket_messages` (
	`id` text PRIMARY KEY,
	`ticket_id` text NOT NULL,
	`author_role` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_support_ticket_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_support_tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `support_ticket_messages_ticket_created_idx` ON `support_ticket_messages` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_tickets_user_updated_idx` ON `support_tickets` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `support_tickets_status_updated_idx` ON `support_tickets` (`status`,`updated_at`);