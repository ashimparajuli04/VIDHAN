# Chat reads: section content resolution across parent/child nodes

## Problem

A "how is theft from home punished" turn burned its whole tool budget re-reading
empty sections and ended on a planning sentence with no citations. Ingest stores
some provisions inconsistently:

- 174 of 308 `rule` nodes in the National Penal (Code) Act are empty and hold
  their text in child `clause` nodes (`:23.1` empty, `:23.1.0`/`:23.1.1` carry
  the text).
- 245 parent/child pairs corpus-wide are complementary — the parent holds
  clause (1) and the children hold the rest (`:23.4`, `:23.5`).
- Depth is not always 2: 2,087 nodes sit at depth 3, and 588 content nodes have
  content-node children.

`getSections` / `getBoundedSection` returned `content ?? ""`, so every
discovery path (prefetch, compact outline, FTS) led back to an empty parent.
FTS also ranks empty parents highly because headings are weighted 6×.

## Decision

Resolve the full subtree at read time in `documents/retrieval.ts`; do not
backfill the database and do not change FTS ranking.

- `loadDescendants` walks `parent_id` breadth-first in batches of 99 (D1's
  bound-parameter cap) and sorts by the document-wide `position`.
- `mergeSectionContent` joins the node's own body plus descendant content in
  reading order, re-attaches `identifier` labels (`(2) A person who…`), and
  skips punctuation-only rows.
- Resolution applies to content nodes only: a chapter read still returns its own
  body, so a container cannot dump every section beneath it.
- `prefetchSections` drops empty resolutions and any hit that is a descendant
  of another hit, avoiding duplicated clause text in the prompt.

Deliberately not done: bulk data backfill; filtering empty nodes out of FTS
(after this change the empty parent is the better, more citable hit); exposing
clause ids in the compact outline (reads are complete now).

## Harness hardening

- Step `FINAL_TEXT_STEP` now sets `activeTools: ["cite"]` alongside the forced
  `toolChoice`, because the provider ignored the forced tool and the cite never
  ran in the failing turn.
- The last step appends a final-answer instruction to the system prompt, so a
  model out of runway does not end on "let me search…".
- When no `cite` ran, references fall back to the last read tool result's node
  ids (`readNodeIds` in `routes/public/chat.ts`), keeping the sources row
  populated.

## Verification

Against a copy of local D1 (`getSections` / `getBoundedSection`):

- `:23.0` → 697 chars from empty; `:23.1` → 1,070 chars including the base
  punishment "not exceeding three years and a fine not exceeding thirty thousand
  rupees".
- `:23.2` (burglary) → 691 chars; definition ("theft in a house … breaking its
  main gate") and punishment ("three to five years and a fine of thirty thousand
  to fifty thousand rupees") both present.
- `doc_foreign_employment_act_2064_2007:1.1` → 1,468 chars across depth-3
  children; container `:1` stays at its own 11-char body.
- `pnpm --filter @vidhan/api typecheck` clean.
