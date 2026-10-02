CREATE TABLE `document_chunks` (
	`document_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT `document_chunks_pk` PRIMARY KEY(`document_id`, `chunk_index`),
	CONSTRAINT `fk_document_chunks_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_chunks_doc_idx` ON `document_chunks` (`document_id`,`chunk_index`);