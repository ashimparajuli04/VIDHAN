CREATE TABLE `documents` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`chunk_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lawyers` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`practice_areas` text NOT NULL,
	`city` text NOT NULL,
	`languages` text NOT NULL,
	`booking_url` text NOT NULL,
	`bar_number` text,
	`years_of_experience` integer,
	`bio` text,
	`verified` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_status_idx` ON `documents` (`status`);--> statement-breakpoint
CREATE INDEX `lawyers_practice_city_idx` ON `lawyers` (`practice_areas`,`city`);