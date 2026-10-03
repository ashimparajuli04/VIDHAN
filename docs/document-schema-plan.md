# Legal Documents — Schema & Tool-Calling Retrieval Plan

Status: **implemented**. Replaces the faked document layer (mock `documents`/`document_chunks`/`document_toc` + vector-RAG design). Real data source: `data/documents-sql-inserts-test/*.sql`.

What shipped and where it deviates from the original sketch:

- `documents.status`/`chunkCount` and the `document_chunks`/`document_toc` tables are gone; `legal_rag_database_design.md` deleted.
- `document_nodes` uses position-based path ids (`{documentId}:{0.2.1}`), not identifier-based, because the two Nepali dumps reuse section identifiers (`section [१]` appears twice per document).
- The node `id` path segment is the position within the *parent chain*, assembled during the recursive walk (not `tier`-derived).
- The ingest converter also writes `apps/web/src/lib/document-ids.generated.ts` for static export (section 5's "needs a generated id list" is now done this way).
- Node inserts are batched under a ~60KB byte budget — D1 rejects statements over ~100KB (`SQLITE_TOOBIG`).

## What the source data is

15 files → **14 unique documents** (`consumer_protection_act.sql` and `(1).sql` are identical). Each file is one `legal_documents` row plus a node tree stored as JSON.

- Metadata: `id`, `title`, `original_title` (always NULL), `document_type` (always `act`), `year_bs`, `year_ad`, `total_pages`, `nodes`, `source_filename`.
- Node shape: `{ tier, nodeType, identifier, title, content, children }`.
- Corpus depth is 2, but the model must support depth up to **3**.
- `nodeType` seen: `preamble` (always exactly one), `chapter` **or** `section_group` at tier 1, `section` at tier 2. Some docs have both `chapter` and `section_group`.
- `section.title` is polluted: heading + start of body run together (`"Short Title and Commencement: (1) This Act may be called the"`); the rest is in `content`.
- `chapter.title` is non-descriptive (`"Chapter-1"`); `section_group.title` is `"Sections"`.
- 2 Nepali docs have garbage ids (`doc_0_it7vg66_pdf`, `doc_0_4_nomy0tn_pdf`).

## Decisions

- **Normalized recursive `document_nodes` table**, not a JSON blob.
- **`documents.summary` stays nullable — populated later** via an LLM + admin action. Not generated now.
- **Citations target the smallest available node** (up to depth 3), precomputed at ingest.
- **Rewire the web reader now.**
- **`document_type` enum: `act | constitution | regulation`.**
- No vector DB. Simple D1 + tool calling.

## 1. Schema (`packages/schema/src/db/schema.ts`)

Replace `documents` (drop fake `status`/`chunkCount`):

| column | type | notes |
|---|---|---|
| `id` | text PK | stable slug; fix the 2 garbage Nepali ids |
| `title` | text not null | as extracted (already includes year) |
| `originalTitle` | text null | always null in this corpus |
| `documentType` | enum `act/constitution/regulation` | |
| `yearBs` / `yearAd` | int null | |
| `totalPages` | int null | |
| `sourceFilename` | text not null | |
| `summary` | text null | **TODO: LLM later** |
| `createdAt` / `updatedAt` | text not null | app-side |

Add `document_nodes` (self-referential):

| column | type | notes |
|---|---|---|
| `id` | text PK | path id: `{documentId}:{0.2.1}` |
| `documentId` | text FK → documents.id | |
| `parentId` | text FK → self, null | |
| `depth` | int not null | 1-based |
| `nodeType` | enum | `preamble, part, chapter, section_group, section, sub_section, clause, schedule` (extend when depth-3 docs arrive) |
| `identifier` | text not null | `"Chapter-1"`, `"3"`, `"Preamble"` |
| `title` | text not null | raw, run-on as extracted |
| `heading` | text null | cleaned heading derived from title (for citation) |
| `content` | text null | body |
| `position` | int not null | order within parent |
| `citation` | text null | precomputed canonical citation |
| `createdAt` | text not null | |

Indexes: `(documentId, position)`, `(documentId, parentId)`, `(documentId, nodeType)`.

Drop tables `document_chunks`, `document_toc`. Rename non-conforming `documentSchema`/`documentCreateSchema` to `Z*`/`T*` per AGENTS.md. Add `ZDocumentNode`, `ZDocumentOutline`, `ZPublicDocument`, etc.

### Citation rule

`{document.title}, {ancestor chain}, {label}{identifier} ({heading})`, skipping `section_group` containers.

- Labels: `chapter` uses identifier verbatim (`"Chapter-1"`), `section` → `"Section 3"`, `preamble` → `"Preamble"`.
- Heading = title truncated at first `:` / newline (`"Short Title and Commencement: (1)..."` → `"Short Title and Commencement"`).
- Example: `Domestic Violence (Offence and Punishment) Act, 2066 (2009), Section 3 (Domestic Violence not to be committed)`

## 2. Ingest converter (`apps/api/src/ingest/documents.ts`, tsx)

1. Read `data/documents-sql-inserts-test/*.sql`; split on `CODEx<hex>` tags, locate the `[{…}]` payload, extract the 9 columns positionally (dollar-quotes + `::jsonb` are PG-only — parsed here, not executed).
2. Dedupe by id; rewrite the 2 garbage ids from the source filename.
3. Walk nodes generically (recursive, not depth-2-assumed); assign path ids, `position`, `depth`; derive `heading` + `citation`.
4. Emit `data/legal-documents.seed.sql` (SQLite syntax, `DELETE`+`INSERT`) for `documents` + `document_nodes`.
5. Scripts: `db:seed:documents` (regenerate) and `db:seed:documents:load` (wrangler). Delete the fake `seed/documents.ts` and the markdown `ingest/cli.ts`.

## 3. API (`routes/public/docs.ts`, `documents/list.ts`)

- `GET /docs` — list/search (`search` over title, later summary; `type` filter; pagination).
- `GET /docs/:id` — metadata + summary.
- `GET /docs/:id/outline` — node tree without content (reader TOC + agent section picking).
- `GET /docs/:id/nodes/:nodeId` — single node: content + citation.
- Remove `/:id/content` and `/:id/toc`. Admin doc routes stay stubs (future summary action).

## 4. Chat tools + prompt (`ai/tools.ts`, `ai/prompts.ts`, `routes/public/chat.ts`)

- Add `list_documents`, `search_documents`, `get_document_outline`, `get_section` (returns content + citation + doc title).
- Prompt: find doc → outline → read section → answer using only retrieved text, cite the stored citation verbatim, refuse when nothing retrieved.
- Raise `stopWhen: stepCountIs(3)` → ~8 so the multi-step retrieval chain completes.

## 5. Web reader rewire

- `lib/documents.ts`: replace chunk/toc calls with `getOutline` / `getNode`.
- `document-detail.tsx`: virtualize over flattened leaf sections from the outline; lazy-fetch section content by node id (cache); TOC built from the outline tree. Remove chunk/toc logic.
- Static-export param generation now reads `REPO_DOCUMENT_IDS` from `apps/web/src/lib/document-ids.generated.ts`, emitted by the ingest converter.

## 6. Cleanup / docs

- Delete `legal_rag_database_design.md` (vector design rejected).
- Update `docs/database.md`; this file records the document-schema decisions.
- Optionally drop the unused `VECTORIZE` binding + `Env` field, and the unused `rag/*` stubs (`chunker`, `search`, `rrf`).

## 7. Verification

`db:generate` → apply migration locally → run converter + load → `typecheck` api + schema → hit the 4 endpoints → manual chat test (needs `OPENROUTER_API_KEY`).

## Follow-ups (not in this pass)

- LLM summary generation + admin action.
- Web chat is still fully mocked; wiring the real API and rendering citation cards is a separate task.
