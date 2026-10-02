CREATE TABLE `document_toc` (
	`document_id` text NOT NULL,
	`position` integer NOT NULL,
	`level` integer NOT NULL,
	`text` text NOT NULL,
	`chunk_index` integer NOT NULL,
	CONSTRAINT `document_toc_pk` PRIMARY KEY(`document_id`, `position`),
	CONSTRAINT `fk_document_toc_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_toc_doc_idx` ON `document_toc` (`document_id`);