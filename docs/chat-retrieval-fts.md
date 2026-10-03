# Chat retrieval: FTS5 + compact outlines + prefetch

## Problem

A topic question ("if I was tortured, up to when can I file a complaint") took
~60–70s. The cost was 6–8 sequential LLM round-trips plus oversized retrieval
payloads:

- `get_document_outline` returned the **entire** node tree (311/349 nodes for the
  Muluki codes, ~100 KB of JSON) into the model context every call.
- `get_section` returned unbounded bodies (one section is 13.6 KB).
- Discovery was model-driven: list → search → outline → read → read → answer.

## Changes

### `documents/retrieval.ts` (new)

Separate retrieval reads for the chat agent, leaving the reader's public
`/docs/:id/outline` shape (`ZDocumentOutline`) untouched.

- `getCompactOutline(db, documentId, { query, limit })` — sections only, minimal
  fields (`id`, `identifier`, `heading`, `chapter`), heading `query` filter,
  default cap 40. DV Act outline drops from ~6.8 KB to ~1.5 KB; Muluki caps at 40
  of 311.
- `getBoundedSection(db, documentId, nodeId, maxChars)` — body capped (default
  6 KB) with `truncated` + `contentLength` so the model knows to fetch more.
- `searchDocumentSections(db, query, limit)` — FTS5/bm25 search over
  `document_nodes_fts`, joined back to node metadata with a `snippet`. Stopwords
  are stripped; heading/title columns weighted 6× over body via
  `bm25(document_nodes_fts, 6.0, 6.0, 1.0)`.

### FTS5 migration `20261003020000_document_nodes_fts`

External-content FTS5 table over `document_nodes(heading, title, content)`, keyed
by `rowid`, with insert/delete/update triggers keeping the index in step.
`unicode61 remove_diacritics 2` tokenizer (handles Devanagari); no stemmer so
legal terms stay exact. Backfills the existing rows.

### Tools (`ai/tools.ts`)

- `get_document_outline` now takes `query` + `limit`, returns the compact shape.
- `search_document_sections` added — one-shot ranked search, preferred over
  outline walking.
- `get_section` now takes `maxChars`, returns the bounded shape.
- `prefetchSections` / `renderPrefetchedContext` added.

### Chat route (`routes/public/chat.ts`)

- Before `streamText`, `prefetchSections` ranks the corpus for the user's message
  and injects the top ~5 sections as system context. Common topic questions can
  answer without a tool chain; the tools remain for the rest.
- `stopWhen` lowered `stepCountIs(8)` → `stepCountIs(5)`.

### Prompt (`ai/prompts.ts`)

`chatSystemPrompt` takes the prefetched context and a retrieval-discipline line:
prefer `search_document_sections`, don't call `list_documents` + `search_documents`
together, don't fetch uncited sections, read at most 3 sections per turn.

## Verification

```pwsh
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
pnpm --filter @vidhan/api typecheck
pnpm --filter @vidhan/api dev
```

Ranking check (local D1): `torture complaint limitation` ranks Domestic Violence
Act §14 "Limitation" first; `domestic violence complaint time limit` returns
§§3–5. FTS row count matches `document_nodes` (1510).

## Not done

- Pagination cursor for outlines > 100 sections (the cap + `query` suffices now).
- Hybrid vector retrieval — deferred until FTS5 is shown to miss paraphrase.
  Section-granularity embeddings with citations kept alongside would be the
  shape.
