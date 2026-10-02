# Document Repo Page — Redesign (alphabetical library)

Status: implemented. The `docs/repo-schema.md` design (nodes/FTS) is not implemented; the live `documents` table is the simple row model.

## Decisions

- **Public repository surface is title + year only.** `TPublicDocument`/API still carry `status` in the DB, but the repo page and its fetcher (`TRepoDocument = { id, title, year }`) deliberately drop everything else. No badges, no categories, no filters.
- **Alphabetical browsing is the primary navigation, not pagination.** The page fetches the whole repository once (`GET /docs?limit=500` — `MAX_LIMIT` raised from 50) and groups it client-side by first letter (`features/documents/groups.ts`, `localeCompare` base-sensitivity). Letters with no documents are omitted from the index (X and Z are uncovered in the seed on purpose). Clicking a letter smooth-scrolls to its group (`scrollToIndex`, respects `prefers-reduced-motion`).
- **The list is virtualized.** Rendering all ~200 rows at once made the page hang, so `GroupedVirtuoso` (`react-virtuoso` v4) now mounts only the rows around the viewport and unmounts them as they scroll away (`useWindowScroll` — the page itself scrolls, no nested box). Group headers stick to the top of the viewport and must have an opaque `bg-background` (v4 emulates pinning by transferring header content into a sticky `TopItemList`). Two v4 gotchas drove the details: `itemContent`'s index is **group-relative** (`sections[groupIndex].documents[index]`), and item sizes come from a `contentRect` ResizeObserver, so headers use padding (never margins) and the row divider sits on the row's inner link, not the item wrapper. The active-letter highlight reads the topmost visible row's `groupIndex` from `itemsRendered` (replaces the old `IntersectionObserver`). Search results stay a plain list — searches rarely return hundreds of rows.
- **Search is client-side over the full set** (200 titles — no round trip). Active search hides the alphabetical grouping and shows `Search results · N documents`; empty results show only "No documents found." (no fabricated suggestions). Clearing returns to the index.
- **Rows are compact full-width links** (`/repo/{id}`), title dominant, year right-aligned and omitted when null, muted chevron. Mobile-first: header → search → index (horizontally scrollable) → count → sections; `max-w-3xl` column keeps it a continuous index, not a grid.
- **Detail page was deliberately empty for a while; it now reads chunked content.** Earlier user decision kept `/repo/[id]` a blank `<main>` (rows navigated there so links were live). Now a virtualized reader renders the document: content is served by `GET /docs/:id/content` in cursor-paginated chunks, fetched lazily as the reader scrolls. Only `seed-doc-001` has content. See `docs/document-content.md` for the full design. Static export still requires `generateStaticParams` → `REPO_DOCUMENT_IDS` (deterministic seed ids, mirroring the lawyers' mock-id approach; swap when the API becomes the id source).
- **Seed is ~200 documents** (`data/documents.seed.sql`) from a curated pool of Nepali statute titles (B.S. years), extended deterministically with `(Rules)`/`(Ordinance)`/amendment variants. ~12 docs have null years to exercise the "omit year" path. All letters A–Y are covered except X/Z. Reload requires wiping first: `DELETE FROM documents` then load the seed (plain INSERT would conflict on the old 20 rows).
- `app/not-found.tsx` added — `output: "export"` + Next 15.5 fails the build without an explicit not-found page.

## How to run

1. `pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local` (migration `warm_gabe_jones` adds `documents.year`)
2. `pnpm --filter @vidhan/api exec wrangler d1 execute DB --local --command="DELETE FROM documents;"` then `pnpm --filter @vidhan/api db:seed:documents:load`
3. `pnpm --filter @vidhan/api dev` + `pnpm --filter @vidhan/web dev` → `/repo`

## Files

- `packages/schema/src/db/schema.ts` — `year`, `DOCUMENT_STATUSES`, `ZPublicDocument`
- `apps/api/src/routes/public/docs.ts` — `GET /docs` (list, max 500) and `GET /docs/:id` (id/title/year)
- `apps/api/src/documents/list.ts` — paginated query helper
- `apps/api/src/seed/documents.ts` + `data/documents.seed.sql`
- `apps/web/src/lib/documents.ts`, `apps/web/src/features/documents/groups.ts`
- `apps/web/src/components/documents/{document-repo,document-row,alphabet-index,document-detail}.tsx`
- `apps/web/package.json` — `react-virtuoso` (virtualized grouped list), `react-markdown` + `remark-gfm` (reader)
- `apps/web/src/app/repo/page.tsx`, `apps/web/src/app/repo/[id]/page.tsx`, `apps/web/src/app/not-found.tsx`
- `apps/web/src/components/ui/pagination.tsx` — no longer used by the repo page (kept for other surfaces)
- Chunked content + reader: see `docs/document-content.md`
