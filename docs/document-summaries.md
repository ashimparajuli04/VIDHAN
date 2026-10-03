# Document Summaries — Plan

Status: **done**. Format reworked in `ingest/summaries.ts` and regenerated
against the current 40-doc cleaned corpus; all 40 summaries generated and loaded
into local D1.

`documents.summary` answers one question for the chat agent: *what is this
document about?* The agent lists titles, reads a document's summary to judge
relevance, then fetches exact sections. The summary is therefore LLM context —
it must be terse and structural, not prose.

## Decisions

1. **Parts-brief only.** The stored string drops the `SUMMARY:` 100-160 word
   prose. It is redundant with the parts brief and burns context. The summary is
   now one terse lead line plus a description of the document's first child
   (depth-1) nodes.
2. **List vs group.** Few top-level nodes (≤ `FEW_PARTS`, 12) are listed one per
   line; many are grouped into 3-6 consecutive ranges. Logic already exists in
   `briefInstruction`; only the wording changes.
3. **Concise fragments.** Sacrifice grammar for concision — fragments over
   sentences, no preamble, no repeated summary text. Plain English.
4. **Plain text, no labels.** No `SUMMARY:` / `PARTS:` markers; the lead line
   then the part lines. The tool returns the string verbatim.
5. **Container test, not allow-list.** The section index in `getDocumentSummary`
   must use `isDocumentContentNode` (`packages/schema/src/db/schema.ts`), not a
   `section`/`sub_section`/`clause` allow-list. The allow-list silently dropped
   the `rule` node type added for the rules documents.
6. **Offline only.** Generation stays an offline CLI run; the chat never pays
   for it. Regeneration must follow any re-ingest.

## Target format

Few parts:

```
<doc short name> — <N parts>.
- <identifier> (<heading>) — <what it covers, fragments>
- ...
```

Many parts:

```
<doc short name> — <N parts>, grouped.
- <first>–<last> (<first heading> … <last heading>) — <what the range covers>
- ...
```

## Changes

- `apps/api/src/ingest/summaries.ts`
  - Prompt: drop "Write a factual summary … 100-160 words"; ask for one lead
    line + parts brief, fragments only, never invent.
  - `briefInstruction`: reword away from "Below the summary"; keep list/group.
  - Output format block: remove `SUMMARY:` / `PARTS:` labels.
  - Update the file header comment.
- `apps/api/src/documents/retrieval.ts`
  - Replace the `isSection` allow-list with `isDocumentContentNode` from
    `@vidhan/schema`.
  - Update the stale "prose summary and the parts brief" comments.
- `apps/api/src/ai/tools.ts` — `get_document_summary` description.
- `apps/api/src/ai/prompts.ts` — line describing what `get_document_summary`
  returns.

## Run order

```pwsh
pnpm --filter @vidhan/api db:seed:summaries        # reads local D1, calls OpenRouter
pnpm --filter @vidhan/api db:seed:summaries:load   # loads UPDATEs into local D1
```

The clean step is not required: `data/documents.cleaned.seed.sql` is empty and
`data/documents.cleaned.report.json` shows 0 changes, so local D1 already holds
the current corpus. Regeneration costs one OpenRouter call per document (40).

## Verification

- `pnpm --filter @vidhan/api typecheck`.
- Seed contains 40 `UPDATE documents` statements.
- Spot-check 2-3 summaries for terseness and list/group shape.

## Flagged, not decided

- **Lead line source.** Decided: the model writes a short document name in the
  lead line; the tool still returns the full `title` separately.
- **`cleanContent` duplication.** `ingest/summaries.ts` repeats a subset of
  `clean/normalize.ts` artifact stripping. Since it now reads the cleaned corpus
  this is redundant; left in as a defensive fallback unless removed.
- **Single-container documents.** A document whose depth-1 is one container gets
  a one-line brief. No depth-selection change proposed.
