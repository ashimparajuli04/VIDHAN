CREATE TABLE `document_node_embeddings` (
	`node_id` text PRIMARY KEY,
	`model` text NOT NULL,
	`dims` integer NOT NULL,
	`vector` text NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_document_node_embeddings_node_id_document_nodes_id_fk` FOREIGN KEY (`node_id`) REFERENCES `document_nodes`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `document_node_embeddings_model_idx` ON `document_node_embeddings` (`model`);