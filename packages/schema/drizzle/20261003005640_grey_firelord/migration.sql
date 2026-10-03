ALTER TABLE `lawyers` ADD `firm_name` text;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `consultation_fee` integer;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `free_first_consultation` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `consultation_modes` text;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `courts` text;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `education` text;--> statement-breakpoint
ALTER TABLE `lawyers` ADD `bar_enrollment_year` integer;