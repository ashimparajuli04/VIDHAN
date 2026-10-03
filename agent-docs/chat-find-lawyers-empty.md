# Chat: `find_lawyers` stuck on "Searching…"

## Symptom

Asked "I want to get divorce, whom can I council with". The assistant prose
streamed, then the tool step showed `Searching for lawyers…` and nothing else —
no status flip, no carousel, no error.

## Root cause

`find_lawyers` executed fine and returned an empty result, because the local D1
`lawyers` table had **0 rows** — the lawyer seed was never applied to the local
database. Documents and chat tables were populated; only `lawyers` was empty.

`searchLawyers` filters `active = 1 AND verified = 1`; against an empty table the
match set is empty, so the tool returned `{ lawyers: [], meta: { total: 0 } }`.
It was not stuck — it was a legitimate empty result.

The UI then lied about it. The adapter maps a tool call with no output yet to
`state: 'input-available'` → `TLawyerSearch` with `lawyers: []`, and
`LawyerStep` / `deriveStatus` treat *zero lawyers* as *still searching*. So an
empty result rendered `Searching for lawyers…` with a spinner forever.

## Fixes

### Data

```pwsh
pnpm --filter @vidhan/api db:seed:load   # data/lawyers.seed.sql → 80 rows
```

Verify: 65 verified+active, 5 family lawyers (`find_lawyers family` → 5).

### Prompt (`apps/api/src/ai/prompts.ts`)

Added: "Do not narrate the steps you are about to take — running a tool call is
already visible to the user." Model preambles ("Let me find relevant lawyers…")
duplicate the tool-call UI.

### UI (`apps/web/src/features/chat/components/lawyer-step.tsx`)

- Empty result now renders `No matching lawyers` instead of an endless
  `Searching for lawyers…` spinner.
- Distinguish pending from empty via the query text: a live search is stored as
  `find_lawyers(<streamed chunks>)` (no `{`), while a completed history call is
  `find_lawyers({...})`. `isSearchingQuery` keys off the `{`.

## Remaining gap (not fixed)

While a tool is genuinely pending (`first-chunk` … `finish`, streaming server-side
execution), the live UI has only the `tool-input-start`/`tool-input-available`
chunks — no output yet — so it is indistinguishable from an empty result until the
`tool-output-available` chunk lands. `deriveStatus` will show `searching` during a
stream that then ends with zero lawyers. On reload the tool state is fully known,
so history renders correctly. Fixing the live case would need a transient
"tool completed empty" signal or a client-visible pending/complete distinction.
