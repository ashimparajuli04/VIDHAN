# Vectorization — semantic hybrid retrieval for the chat agent

Status: **shipped**. Embeddings are in the chat retrieval path so paraphrase
and cross-lingual questions hit the right provisions. FTS5 stays; vectors are
fused with it, not a replacement. This resolves the "Not done" item in
`docs/chat-retrieval-fts.md` ("hybrid vector retrieval — deferred until FTS5 is
shown to miss paraphrase").

Landed: `document_node_embeddings` table + migration
`20261003135611_pink_wild_pack`; `ai/embeddings.ts`, `rag/vectors.ts`,
`rag/rrf.ts`, `ingest/embeddings.ts`; `hybridSearchSections` wired into
`prefetchSections` and the `search_document_sections` tool. `EMBEDDING_MODEL` /
`EMBEDDING_DIMS` pinned in `wrangler.toml`.

## Why

Retrieval today is `searchDocumentSections` (`apps/api/src/documents/retrieval.ts`)
— FTS5 keyword match. It is lexical: it matches literal tokens.

- Works: `torture complaint limitation` ranks DV Act §14.
- Misses: `my husband beats me, can I report him` shares almost no tokens with
  `Domestic Violence (Offence and Punishment) Act`; `toFtsQuery` drops
  stopwords and ORs the leftovers.
- Misses hardest across languages: chat accepts English / roman-Nepali /
  Devanagari, the corpus is largely Devanagari. FTS5 cannot match a roman-Nepali
  query to a Devanagari section. A multilingual embedding model puts all three
  in one vector space.

The 60–70s latency problem in `docs/chat-retrieval-fts.md` was tool-chain
length, not slow SQL. Better first-pass recall in `prefetchSections` means fewer
LLM round-trips, so the answer is faster even though an embedding call is added.

## Decisions

- **Vector store: D1, brute-force cosine in the Worker.** Not Vectorize. The
  corpus is ~1510 citable nodes × 1024 dims × 4 B ≈ 6 MB; a full scan is a few
  ms. Vectorize has no local emulation (remote binding only), which would break
  the local D1 seed loop. Revisit at 100k+ vectors.
- **Granularity: section-level only.** Embed every citable node
  (`isDocumentContentNode`). The model already reads all 40 titles via
  `get_document_titles`, so summary-level routing adds little.
- **Model: multilingual (`baai/bge-m3`, 1024 dims).** Chosen over
  `text-embedding-3-small` for Nepali/Devanagari cross-lingual recall.
  `qwen/qwen3-embedding-8b` + `dimensions: 1024` is the fallback. Model + dims
  are env-driven and swappable.
- **Chat retrieval only.** `prefetchSections` + the `search_document_sections`
  tool. Public repo search (`GET /docs?search=`) is out of scope.
- **Hybrid, fused with RRF** (`score = Σ 1/(k + rank)`, k = 60). FTS keeps
  exact-term precision (section numbers, act names, Devanagari tokens); vectors
  add meaning.

## Shape

### Table `document_node_embeddings`

| column | type | notes |
|---|---|---|
| `node_id` | text PK, FK → `document_nodes.id` **ON DELETE CASCADE** | |
| `model` | text not null | e.g. `baai/bge-m3` |
| `dims` | integer not null | |
| `vector` | blob not null | float32 little-endian, L2-normalized |
| `content_hash` | text not null | sha256(heading + content + model) |
| `updated_at` | text not null | |

Separate table, not a `document_nodes` column: the FTS external-content triggers
(`20261003020000_document_nodes_fts`) would churn on every vector write.
L2-normalized so cosine is a plain dot product.

`ON DELETE CASCADE` is required, not cosmetic: `data/legal-documents.seed.sql`
starts with `DELETE FROM document_nodes; DELETE FROM documents;` and D1 enforces
FKs. Without cascade that delete fails once embeddings exist (or orphans them).
Cascade also means a documents reseed clears stale vectors automatically — the
embeddings seed must be re-run after `db:seed:documents:load`.

### Modules

- `apps/api/src/ai/embeddings.ts` — `embedTexts` (`embedMany`), `embedQuery`,
  float32↔BLOB + normalize. Shared by ingest and query.
- `apps/api/src/ingest/embeddings.ts` — offline, mirrors `ingest/summaries.ts`:
  read local D1 as JSON → citable nodes → `heading + "\n" + content` truncated to
  ~6000 chars (model context) → batch embed → emit
  `data/document-embeddings.seed.sql` (`X'…'` blobs, one `INSERT` per row to stay
  under D1's 100 KB statement cap). Idempotent via `content_hash` + `model`.
- `apps/api/src/rag/vectors.ts` — `loadVectors` (lazy, optional per-isolate
  cache), `cosineTopK`.
- `apps/api/src/rag/rrf.ts` — `rrfFuse`.
- `retrieval.ts` — `hybridSearchSections(db, env, query, limit)` = embed query
  once → FTS + vector → RRF → join node metadata → same `TSectionMatch` shape.
  `searchDocumentSections` (FTS-only) stays as the fallback.

### Config

- `Env` (`apps/api/src/index.ts`) + `wrangler.toml` `[vars]`:
  `EMBEDDING_MODEL`, `EMBEDDING_DIMS`.
- `apps/api/package.json`: `db:seed:embeddings`, `db:seed:embeddings:load`.
- `.gitignore`: `data/document-embeddings.seed.sql` — ~12 MB of derived hex,
  regenerable from committed source + script.

## Guardrails

- Query embed failure or no vectors for the current model → **FTS-only**, never
  fail the turn.
- Model mismatch filtered out; missing rows degrade to FTS-only.
- Batch inserts respect D1's 100-bound-parameter cap.
- Embed input truncated to the model context; store `dims` to validate blob
  length on read.

## Verification

```pwsh
pnpm --filter @vidhan/schema db:generate
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
pnpm --filter @vidhan/api db:seed:embeddings
pnpm --filter @vidhan/api db:seed:embeddings:load
pnpm --filter @vidhan/api typecheck
pnpm dev:api
```

Acceptance: a paraphrase query (`my husband beats me, can I report him`) and a
roman-Nepali query both rank the DV Act provisions first; a query with an exact
section number still ranks via FTS.

To swap the embedding model: `GET https://openrouter.ai/api/v1/embeddings/models`
to confirm the exact id and dimension, pin `EMBEDDING_MODEL` / `EMBEDDING_DIMS`,
then re-run the embeddings seed. Query-time reads filter by model, so a switch
loads a fresh vector set and stale rows are ignored.

## Not done

- Public repo search (`GET /docs?search=`) stays keyword-only.
- Two-stage summary embeddings — only worth it if the corpus grows large.
- Vectorize migration path — if the corpus outgrows brute force, move
  `rag/vectors.ts` behind the same interface.
