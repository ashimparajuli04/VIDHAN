-- Reason token trace for the collapsible thinking panel.
-- Hand-written: `drizzle-kit generate` is blocked by conflicting branches in the
-- migration graph (duplicate seniority/user_usage changes from a merge), so this
-- column is applied as a standalone migration.
ALTER TABLE `chat_messages` ADD `reasoning` text;
