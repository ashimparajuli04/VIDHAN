# Database — Decisions

Cloudflare **D1 (SQLite)** holds structured data (catalog, metadata). **Vectorize** holds embeddings — D1 has no vector support. Drizzle ORM is the single access layer, bound to the Worker's `DB` D1 binding (`apps/api/src/db.ts`).

## Where things live

| Concern | Location |
|---|---|
| Table definitions + zod schemas + types | `packages/schema/src/db/schema.ts` |
| Public exports | `packages/schema/src/index.ts` |
| drizzle-kit config | `packages/schema/drizzle.config.ts` |
| Generated migrations | `packages/schema/drizzle/<timestamp>_<name>/migration.sql` |
| D1 binding + migrations dir | `apps/api/wrangler.toml` |
| Local D1 state (gitignored) | `apps/api/.wrangler/state/v3/d1` |

Schema lives in `@vidhan/schema` (not the api app) because both the api and the frontends consume the derived types.

## Tables

`lawyers` — catalog + escalation target.

- `id` text PK (uuid, generated app-side)
- `practiceAreas`, `languages` — JSON text columns, typed via `.$type<...[]>()`
- `bookingUrl` NOT NULL — only contact channel (no phone/email stored)
- `barNumber`, `yearsOfExperience`, `bio` nullable
- `verified`, `active` — boolean mode over integer, defaults `false`/`true`
- `createdAt`, `updatedAt` — ISO strings set app-side
- composite index `(practice_areas, city)` for escalation lookup

`documents` — repo metadata (chunks live in Vectorize).

- `id` text PK
- `summary` nullable — AI-generated at ingest
- `status` enum `pending | indexed | failed`, default `pending`
- `chunkCount` default `0`
- index on `status`

## Conventions

- **Types derive from Drizzle, not hand-written.** `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` from `drizzle-orm/zod`; refinements applied per column. `create`/`update` schemas omit `id` + timestamps (set server-side).
- **Soft-delete** via `active` on lawyers — a row never disappears mid-conversation.
- **Timestamps are ISO text** written by the route, not DB defaults.
- **`practiceAreas` is a closed enum** (`PRACTICE_AREAS`) so the escalation verdict joins directly to SQL — no fuzzy matching. Adding an area = one line in the const.
- **`city` is free text** — Nepal cities too varied to enumerate; exact/`LIKE` match, fall back to area-only.
- **API envelope** — `{ lawyers }` / `{ lawyer }` on success, `{ error, details? }` on failure. Validation via `parseJson` + `validationError` (`apps/api/src/lib/validate.ts`) → `400 validation_error` with flattened zod issues.

## Migration workflow

```pwsh
# after editing schema.ts
pnpm --filter @vidhan/schema db:generate
# apply locally
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
```

`wrangler.toml` points `migrations_dir` at `packages/schema/drizzle`, so drizzle-kit generates and wrangler applies — no second copy of the SQL.

## Verifying DB setup (local)

```pwsh
# 1. all migrations applied?
pnpm --filter @vidhan/api exec wrangler d1 migrations list DB --local
# 2. tables exist?
pnpm --filter @vidhan/api exec wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
# 3. start api, hit a DB-backed route
pnpm dev:api
Invoke-RestMethod http://localhost:8787/lawyers   # -> { lawyers = @() }
```

## Remote

`wrangler.toml` ships placeholders: `database_id = "0000..."`, empty `ADMIN_TOKEN` / `OPENROUTER_API_KEY`. Before deploy: create the D1 database, paste the real id, set secrets with `wrangler secret put`, then `wrangler d1 migrations apply DB --remote`.

## Typecheck

`apps/api` is a Worker (`@cloudflare/workers-types`), but the ingest CLI (`src/ingest/cli.ts`) is a Node script run through `tsx`. Both type sets are listed in `apps/api/tsconfig.json` (`types: ["@cloudflare/workers-types", "node"]`) with `@types/node` as a devDependency — without it the CLI's `node:fs/promises` / `process` fail to resolve.
