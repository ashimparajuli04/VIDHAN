-- Full-text search over document node bodies + headings for the chat retrieval
-- agent. External-content FTS5 table keyed by document_nodes.rowid, with
-- triggers keeping the index in step. `unicode61` tokenizer handles the
-- Devanagari sections; the porter stemmer is intentionally omitted so exact
-- legal terms survive.
CREATE VIRTUAL TABLE `document_nodes_fts` USING fts5(
	`heading`,
	`title`,
	`content`,
	content='document_nodes',
	content_rowid='rowid',
	tokenize='unicode61 remove_diacritics 2'
);--> statement-breakpoint
INSERT INTO `document_nodes_fts` (`rowid`, `heading`, `title`, `content`)
SELECT `rowid`, `heading`, `title`, `content` FROM `document_nodes`;--> statement-breakpoint
CREATE TRIGGER `document_nodes_fts_ai` AFTER INSERT ON `document_nodes` BEGIN
	INSERT INTO `document_nodes_fts` (`rowid`, `heading`, `title`, `content`)
	VALUES (new.`rowid`, new.`heading`, new.`title`, new.`content`);
END;--> statement-breakpoint
CREATE TRIGGER `document_nodes_fts_ad` AFTER DELETE ON `document_nodes` BEGIN
	INSERT INTO `document_nodes_fts` (`document_nodes_fts`, `rowid`, `heading`, `title`, `content`)
	VALUES ('delete', old.`rowid`, old.`heading`, old.`title`, old.`content`);
END;--> statement-breakpoint
CREATE TRIGGER `document_nodes_fts_au` AFTER UPDATE ON `document_nodes` BEGIN
	INSERT INTO `document_nodes_fts` (`document_nodes_fts`, `rowid`, `heading`, `title`, `content`)
	VALUES ('delete', old.`rowid`, old.`heading`, old.`title`, old.`content`);
	INSERT INTO `document_nodes_fts` (`rowid`, `heading`, `title`, `content`)
	VALUES (new.`rowid`, new.`heading`, new.`title`, new.`content`);
END;
