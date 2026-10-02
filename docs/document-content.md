# Document Content — chunked API + virtualized reader

Status: implemented (2026-10-02). The detail page (`/repo/[id]`) is no longer a blank page: it reads document content through a chunked endpoint and renders it in a virtualized reader.

## Decisions

- **Content lives in a `document_chunks` table**, not on `documents`. Document-level "nullability": a document without content simply has zero rows (and `chunk_count = 0`); chunk rows always carry text. Composite PK `(document_id, chunk_index)` — no surrogate id, mirrors how the API always queries by chunk offsets.
- **`GET /docs/:id/content?limit=N&after=M` is cursor-paginated.** `after` is the last chunk index already received (`-1` = start); the response carries `{ documentId, chunks: [{index, content}], totalChunks, nextIndex }` (`nextIndex` null on the last page). The API never ships a whole long document in one response. `limit` default 10, capped at 50. Contract shared via `ZDocumentChunksPage` in `@vidhan/schema`.
- **Segmentation is for display, not retrieval — chunks do NOT overlap.** The reader renders chunks back-to-back, so duplicated overlap text would be visible to users. The chunker (`apps/api/src/rag/chunker.ts`) cuts at ~2000 chars, nudging the cut to the last paragraph break (`\n\n`), then newline, then sentence end inside the window. This keeps markdown structure (headings, list blocks) intact in almost all cases; a split inside a table/list is an accepted edge case.
- **Ingest is a local script, not an API pipeline.** `apps/api/src/ingest/cli.ts` reads `data/*.md` (each `seed-doc-NNN.md` maps to that document id, others fall back to `seed-doc-001`), chunks the text, and writes `data/content.seed.sql` (DELETE + INSERT chunks, then set `chunk_count`/`status='indexed'` on the document). It also **resets every other document** to `chunk_count = 0, status = 'pending'`, clearing the fake chunk counts the old seed wrote — content is null for everyone except the documents with MD files. Reloading is idempotent.
- **Only `seed-doc-001` has content today** (a mock constitution, `data/seed-doc-001.md`). All other documents exercise the empty state: "No content available for this document yet."
- **The reader virtualizes + lazily loads.** `DocumentDetail` (client component) fetches title/year via `getDocument` and the first chunk page in parallel, then a plain `Virtuoso` (window scroll, same as the repo list) renders chunks around the viewport only. `rangeChanged` prefetches one page (`PREFETCH_GAP` ahead of the visible range) when the frontier is reached; loaded chunks are cached in a `Map`; unloaded rows render skeleton placeholders so the scrollbar stays stable. Chunks render through `react-markdown` + `remark-gfm` (tables from the mock constitution) styled with `@tailwindcss/typography` (`prose`). v10 note: `className` was removed from react-markdown — the prose classes sit on a wrapper div.

## How to run (fresh database)

1. `pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local`
2. Seed documents: `pnpm --filter @vidhan/api db:seed:documents:load` (wipe first if re-loading: `DELETE FROM documents;`)
3. Generate + load content: `pnpm --filter @vidhan/api db:seed:content` (reads `data/*.md` → writes `data/content.seed.sql`) then `pnpm --filter @vidhan/api db:seed:content:load`
4. `pnpm --filter @vidhan/api dev` + `pnpm --filter @vidhan/web dev` → `/repo` → any row → only `seed-doc-001` shows the reader.

## Files

- `packages/schema/src/db/schema.ts` — `document_chunks`, `ZDocumentChunksPage`
- `packages/schema/drizzle/20261002161835_fine_thundra/` — migration
- `apps/api/src/rag/chunker.ts` — real chunker (was a stub returning `[]`)
- `apps/api/src/routes/public/docs.ts` — `GET /docs/:id/content`
- `apps/api/src/ingest/cli.ts` — MD → `data/content.seed.sql`
- `apps/api/package.json` — `db:seed:content:load`
- `apps/web/src/lib/documents.ts` — `getDocument`, `getDocumentChunks`
- `apps/web/src/components/documents/document-detail.tsx` — virtualized reader
- `apps/web/src/app/repo/[id]/page.tsx` — detail route
- `apps/web/src/app/globals.css` — `@tailwindcss/typography` plugin
- `data/seed-doc-001.md`, `data/content.seed.sql`