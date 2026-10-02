ALTER TABLE `lawyers` RENAME COLUMN `city` TO `district`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lawyers` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`practice_areas` text NOT NULL,
	`district` text NOT NULL,
	`languages` text NOT NULL,
	`booking_url` text,
	`bar_number` text,
	`years_of_experience` integer,
	`bio` text,
	`verified` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_lawyers`(`id`, `name`, `practice_areas`, `district`, `languages`, `booking_url`, `bar_number`, `years_of_experience`, `bio`, `verified`, `active`, `created_at`, `updated_at`) SELECT `id`, `name`, `practice_areas`, `district`, `languages`, `booking_url`, `bar_number`, `years_of_experience`, `bio`, `verified`, `active`, `created_at`, `updated_at` FROM `lawyers`;--> statement-breakpoint
DROP TABLE `lawyers`;--> statement-breakpoint
ALTER TABLE `__new_lawyers` RENAME TO `lawyers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `lawyers_practice_city_idx`;--> statement-breakpoint
CREATE INDEX `lawyers_practice_district_idx` ON `lawyers` (`practice_areas`,`district`);--> statement-breakpoint
CREATE UNIQUE INDEX `lawyers_bar_number_unique` ON `lawyers` (`bar_number`);