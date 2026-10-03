# Database — Decisions

Cloudflare **D1 (SQLite)** holds structured data (catalog, metadata, the legal document tree). There is **no vector DB** — retrieval is tool calling over D1 (see `docs/document-schema-plan.md`). Drizzle ORM is the single access layer, bound to the Worker's `DB` D1 binding (`apps/api/src/db.ts`).

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
- `district` — validated against the `DISTRICTS` const (all 77, shared with web/admin dropdowns)
- no reach field. Contact fields (`phone`, `whatsapp`, `email`, `officeAddress`) and any
  direct booking link are deliberately absent from the model — a lawyer is reached only by
  a platform callback request (`lawyer_requests`), never a public channel (see
  `docs/web-lawyer-details.md`).
- `barNumber`, `yearsOfExperience`, `bio` nullable
- `firmName`, `consultationFee` (NPR, null = not listed), `freeFirstConsultation` (default
  `false`), `consultationModes` / `courts` / `education` (JSON, closed enums
  `CONSULTATION_MODES` / `COURTS`, `education` = `{ degree, institution, year? }[]`),
  `barEnrollmentYear` — all nullable decision-useful fields for the profile page
- unique index on `bar_number` (unique only when present)
- `verified`, `active` — boolean mode over integer, defaults `false`/`true`
- `createdAt`, `updatedAt` — ISO strings set app-side
- composite index `(practice_areas, district)` for catalog lookup

`lawyer_requests` — on-platform callback leads; the only path from user to lawyer.

- `id` text PK (uuid, generated app-side)
- `lawyerId` FK → `lawyers.id`, `userId` FK → `users.id`
- `phone` not null — the only contact field the form collects (name/email come from `users`)
- `preferredTime` not null — free text ("Tomorrow evening"), not a datetime
- `mode` nullable — reuses `CONSULTATION_MODES`
- `note` nullable
- `status` — `LAWYER_REQUEST_STATUSES` (`pending | contacted | closed`), default `pending`
- `createdAt`, `updatedAt` — ISO strings
- indexes `(user_id, created_at)` for the user's list, `lawyer_id` for the queue

`documents` — one row per source statute (`act | constitution | regulation`).

- `id` text PK — slug from the source id
- `title` — as extracted, already includes the year
- `originalTitle` nullable — always null in the current corpus
- `documentType` — closed enum; `yearBs`, `yearAd`, `totalPages` nullable ints
- `sourceFilename` not null
- `summary` nullable — populated later via LLM + admin action, never at ingest
- `createdAt`, `updatedAt` — ISO strings
- indexes on `document_type` and `title`

`document_nodes` — normalized recursive tree (self-referential via `parent_id`).

- `id` text PK — path id `{documentId}:{0.2.1}` (each segment is the 0-based position within its parent; positions not identifiers, so reused identifiers can't collide)
- `documentId` FK → `documents.id`
- `parentId` FK → self, nullable
- `depth` int (1-based), `position` int (order within parent)
- `nodeType` enum — `preamble, part, chapter, section_group, section, sub_section, clause, schedule`
- `identifier`, `title` (raw, run-on as extracted), `heading` (derived), `content` nullable
- `citation` nullable — precomputed canonical citation, null only for `section_group` containers
- indexes `(document_id, position)`, `(document_id, parent_id)`, `(document_id, node_type)`

### Document ingest + citation

`apps/api/src/ingest/documents.ts` (tsx) parses the PG dumps in
`data/documents-sql-inserts-test/` (dollar-quoted JSONB, parsed not executed),
dedupes by id, walks the node tree recursively, derives each `heading` (title
truncated at the first `:`/newline) and `citation`, then writes
`data/legal-documents.seed.sql`. It also writes the id list to
`apps/web/src/lib/document-ids.generated.ts` so the web static export can
enumerate `/repo/[id]` routes.

Citations follow `{document title}, {ancestor labels}, {label} ({heading})`,
skipping `section_group` containers. Labels: `section` → `"Section 3"`, `chapter`
verbatim (`"Chapter-1"`), `preamble` → `"Preamble"`. Example:
`Domestic Violence (Offence and Punishment) Act, 2066 (2009), Section 3 (Domestic Violence not to be committed)`.

A source dump whose JSON is OCR-garbled or missing headings can be corrected
from a curated plain-text transcription before re-ingest. The corrected text is
parsed into the same `{tier, nodeType, identifier, title, content, children}`
shape and spliced into the dump's `nodes` JSON (or the dump is regenerated), then
`db:seed:documents` runs unchanged. The asset-laundering source was rebuilt this
way from `data/fixes/…asset_laundering…pdf.txt`, which supplies the 8 chapter
descriptions the extraction dropped and repairs split words (`prev ent` →
`prevent`).

## Conventions

- **Types derive from Drizzle, not hand-written.** `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` from `drizzle-orm/zod`; refinements applied per column. `create`/`update` schemas omit `id` + timestamps (set server-side). Schemas are `Z*`, inferred types `T*` (`ZLawyer`, `TLawyer`).
- **Soft-delete** via `active` on lawyers — a row never disappears mid-conversation.
- **Timestamps are ISO text** written by the route, not DB defaults.
- **`practiceAreas` is a closed enum** (`PRACTICE_AREAS`) so the escalation verdict joins directly to SQL — no fuzzy matching. Adding an area = one line in the const.
- **`district` is a closed enum** (`DISTRICTS`, all 77) — exact match; empty-district recovery returns per-district counts instead of silently relaxing.
- **API envelope** — `{ lawyers }` / `{ lawyer }` on success (public list adds `meta: { total, districtCounts? }`), `{ error, details? }` on failure. Validation via `parseJson` + `validationError` (`apps/api/src/lib/validate.ts`) → `400 validation_error` with flattened zod issues.

## Migration workflow

```pwsh
# after editing schema.ts
pnpm --filter @vidhan/schema db:generate
# apply locally
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
```

`wrangler.toml` points `migrations_dir` at `packages/schema/drizzle`, so drizzle-kit generates and wrangler applies — no second copy of the SQL.

## Seeding mock lawyers (local)

`apps/api/src/seed/lawyers.ts` deterministically generates 80 lawyers (every practice area and district covered) and writes `data/lawyers.seed.sql`.

```pwsh
pnpm --filter @vidhan/api db:seed        # regenerate data/lawyers.seed.sql
pnpm --filter @vidhan/api db:seed:load   # load into local D1
```

## Seeding legal documents (local)

`apps/api/src/ingest/documents.ts` converts the source dumps into `data/legal-documents.seed.sql` and the web id module.

```pwsh
pnpm --filter @vidhan/api db:seed:documents        # regenerate seed + generated id list
pnpm --filter @vidhan/api db:seed:documents:load   # load into local D1 (DELETE + INSERT, idempotent)
```

The seed runs a `DELETE` of `document_nodes` + `documents` first, so reloading is safe.

## Verifying DB setup (local)

```pwsh
# 1. all migrations applied?
pnpm --filter @vidhan/api exec wrangler d1 migrations list DB --local
# 2. tables exist?
pnpm --filter @vidhan/api exec wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
# 3. start api, hit a DB-backed route
pnpm dev:api
Invoke-RestMethod http://localhost:8787/lawyers   # -> { lawyers = @(); meta = @{ total = 0 } }
```

## Remote

`wrangler.toml` ships placeholders: `database_id = "0000..."`, empty `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `OPENROUTER_API_KEY`. Before deploy: create the D1 database, paste the real id, set secrets with `wrangler secret put`, then `wrangler d1 migrations apply DB --remote`.

## Typecheck

`apps/api` is a Worker (`@cloudflare/workers-types`), but the ingest converter (`src/ingest/documents.ts`) is a Node script run through `tsx`. Both type sets are listed in `apps/api/tsconfig.json` (`types: ["@cloudflare/workers-types", "node"]`) with `@types/node` as a devDependency — without it the converter's `node:fs/promises` / `process` fail to resolve. D1 rejects statements over ~100KB (`SQLITE_TOOBIG`), so the node inserts are batched under a byte budget.
