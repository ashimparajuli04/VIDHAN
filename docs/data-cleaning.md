# Data Cleaning Pipeline — Plan

Status: **implemented**. The deterministic layer and the LLM edit-list pass both
run; the artifact loads with `db:clean:documents:load`. Deviations worth noting:

- Loss check is a **conservation fingerprint**, not "modulo applied edits": the
  non-whitespace character stream with the known normalizations erased (artifact
  lines, the fold's first separator) must be identical before and after. Any
  node that fails is reverted whole (deterministic layer included) and logged.
- The deterministic layer strips artifact lines **before** the title-tail fold,
  so a page counter that would otherwise sit at the start of the folded tail is
  still dropped.
- LLM verify fingerprints non-whitespace across the whole node and replays the
  applied edits; a mismatch reverts just the LLM edits, keeping the
  deterministic layer.
- `sourceFilename` needs no report entry: the fold touches `title`/`content`
  only, and any non-whitespace change to those is caught by the fingerprint.
- Shared CLI helpers moved to `apps/api/src/ingest/d1.ts`; the model call is
  shared via `apps/api/src/ai/openrouter.ts` (fetch-only, safe for the Worker
  graph), used by both `ingest/summaries.ts` and `clean/llm.ts`.
- `tsx src/clean/documents.ts --no-llm` runs the deterministic layer alone for
  dev / idempotency checks.

The source dumps carry OCR / text-extraction artifacts and a structural bug that
loses text on screen. This pipeline cleans `document_nodes` after ingest without
changing what any provision says, and emits a versioned artifact that a second
load step applies. See `docs/document-schema-plan.md` for the schema this must
conform to and `docs/database.md` for ingest.

## Why a separate pipeline, not the converter

The known bug (below) is structural, not dirty text. It belongs with all other
text cleanup, in one place, rather than scattered through
`apps/api/src/ingest/documents.ts`. The converter stays as-is; it must keep NUL
ligature expansion because `\u0000` cannot be stored.

### The bug this fixes

Source dumps run a section heading into the start of its body inside
`node.title` — e.g. `"Assets not to Be Laundered: (1) Nobody shall launder or
cause to launder"`. The converter stores that whole string as `title`, derives
`heading` by truncating at the first `:`/newline, and leaves the tail out of
`content`. The reader (`apps/web/src/components/documents/document-detail.tsx`,
`ReaderRow`) renders `heading ?? title` then `content`, so the tail — often
clause (1) of a section — is silently dropped everywhere.

## Decisions

1. **Artifact model.** Mirrors `apps/api/src/ingest/summaries.ts`: read local D1
   as JSON, clean, emit `data/documents.cleaned.seed.sql` (UPDATEs) plus a
   report. The LLM runs once at generate time; loading never calls it.
2. **Hybrid.** Deterministic code does all structural / formatting work. The LLM
   only does judgment repairs and returns a **surgical edit-list**
   (`[{ find, replace, reason }]`) applied only on exact-once matches. No free
   rewrites — this is what makes "no data lost, meaning unchanged" mechanical.
3. **Placement.** The title-tail fold and all text cleanup live here, not in the
   converter.
4. **No schema change.** Output conforms exactly to `document_nodes`: `title`
   non-null, `heading` / `content` nullable, and `preamble | chapter |
   section_group` keep `heading = null`.
5. **Citations stay valid.** The fold keeps `heading` unchanged (pre-colon), and
   `buildCitation` keys off `heading`, so no rebuild is needed. The pipeline
   asserts citations are unchanged.
6. **Idempotent.** Re-running on cleaned data is a no-op: the fold finds no
   colon, the LLM finds no matches, so zero UPDATEs.
7. **Fail-safe.** A failed or invalid LLM batch never alters nodes; the
   deterministic layer still applies and the failure is recorded in the report.

## Stages (`apps/api/src/clean/`)

1. **Read** — `wrangler d1 execute DB --local --json`; pull all `document_nodes`
   and `documents`.
2. **Deterministic normalize** (`normalize.ts`):
   - **Title-tail fold** — split `title` at the first `:`/`\n`; set
     `heading = title = pre`; prepend `tail` to `content`. Skip container node
     types. No colon → untouched.
   - Strip extraction artifacts — page-number-only lines,
     `www.lawcommission.gov.np N` footers, repeated capture headers.
   - Whitespace — NBSP → space, strip zero-width chars, collapse 3+ blank lines
     to 2, trim trailing spaces. Conservative: never join legitimate paragraph
     breaks.
   - Markdown-shape `content` — blank-line paragraphs, clause markers `(1)`,
     `(2)` on their own lines, no stray markdown.
   - Keep the date-of-authentication block; it is legally meaningful.
3. **LLM pass** (`llm.ts`) — batch content nodes per document (~8k-char chunks),
   temperature 0, JSON mode; returns `{ id, edits[] }[]` validated by Zod.
   Zero-match and multi-match edits are rejected and logged.
4. **Verify & emit** — per node, assert the original non-whitespace text is
   recoverable modulo applied edits and known normalizations. Any unexplained
   diff reverts that node and is logged. Emit UPDATE SQL for changed rows plus
   `data/documents.cleaned.report.json`.

## Files

- `apps/api/src/clean/documents.ts`, `normalize.ts`, `llm.ts`.
- `apps/api/src/ingest/d1.ts` — shared `runD1Json` / `readApiKey`.
- `apps/api/src/ai/openrouter.ts` — shared model caller (fetch-only).
- `apps/api/package.json` — `db:clean:documents`, `db:clean:documents:load`.
- `docs/data-cleaning.md` (this file).

## Run order (produces final data)

```pwsh
pnpm --filter @vidhan/api db:seed:documents
pnpm --filter @vidhan/api db:seed:documents:load
pnpm --filter @vidhan/api db:clean:documents        # reads DB, emits artifact
pnpm --filter @vidhan/api db:clean:documents:load
```

The cleaning pass must re-run after any re-ingest, since
`db:seed:documents:load` starts with `DELETE FROM document_nodes; DELETE FROM
documents;`. FTS refreshes automatically via the UPDATE trigger.

## Verification

- Built-in no-loss fingerprint and the generated report (stage 4). A full local
  run cleans 2055 nodes (0 reverted), and re-running emits 0 UPDATEs.
- Spot-check asset-laundering §3: `content` now opens
  `(1) Nobody shall launder or cause to launder assets.` followed by
  `(2) Any one committing…`, `heading` and `citation` unchanged.
- `pnpm --filter @vidhan/api typecheck`.

## Flagged, not fixed

- The curated `data/fixes/…asset_laundering…pdf.txt` and any wrong headings are
  source-data issues — reported, never invented.
- The `Introductory matter` placeholder title is cosmetic, left alone.
- The reader is not hardened; the fix is upstream.
