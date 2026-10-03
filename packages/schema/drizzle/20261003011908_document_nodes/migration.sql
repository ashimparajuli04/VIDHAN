CREATE TABLE `document_nodes` (
	`id` text PRIMARY KEY,
	`document_id` text NOT NULL,
	`parent_id` text,
	`depth` integer NOT NULL,
	`node_type` text NOT NULL,
	`identifier` text NOT NULL,
	`title` text NOT NULL,
	`heading` text,
	`content` text,
	`position` integer NOT NULL,
	`citation` text,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_document_nodes_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`),
	CONSTRAINT `fk_document_nodes_parent_id_document_nodes_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `document_nodes`(`id`)
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `original_title` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `document_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `year_bs` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `year_ad` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `total_pages` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `source_filename` text NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `documents_status_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `document_chunks_doc_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `document_toc_doc_idx`;--> statement-breakpoint
CREATE INDEX `document_nodes_doc_position_idx` ON `document_nodes` (`document_id`,`position`);--> statement-breakpoint
CREATE INDEX `document_nodes_doc_parent_idx` ON `document_nodes` (`document_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `document_nodes_doc_type_idx` ON `document_nodes` (`document_id`,`node_type`);--> statement-breakpoint
CREATE INDEX `documents_type_idx` ON `documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `documents_title_idx` ON `documents` (`title`);--> statement-breakpoint
DROP TABLE `document_chunks`;--> statement-breakpoint
DROP TABLE `document_toc`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `year`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `chunk_count`;