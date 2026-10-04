-- Client-facing consultation fee in NPR.
-- Hand-written: `drizzle-kit generate` is blocked by conflicting branches in the
-- migration graph (duplicate seniority/user_usage changes from a merge), so this
-- column is applied as a standalone migration.
ALTER TABLE `lawyers` ADD `price` integer DEFAULT 0 NOT NULL;