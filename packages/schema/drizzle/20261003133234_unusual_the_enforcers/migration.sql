CREATE TABLE `enterprise_members` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`tokens_allocated` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_enterprise_members_organization_id_enterprise_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `enterprise_organizations`(`id`),
	CONSTRAINT `fk_enterprise_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `enterprise_organizations` (
	`id` text PRIMARY KEY,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`approved_seats` integer NOT NULL,
	`tokens_per_member` integer NOT NULL,
	`start_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_enterprise_organizations_request_id_enterprise_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `enterprise_requests`(`id`)
);
--> statement-breakpoint
CREATE INDEX `enterprise_members_org_status_idx` ON `enterprise_members` (`organization_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_members_org_email_unique` ON `enterprise_members` (`organization_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_organizations_request_unique` ON `enterprise_organizations` (`request_id`);