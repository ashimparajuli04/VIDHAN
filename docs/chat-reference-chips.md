# Chat reference chips (cited sources footer)

## Problem

Retrieval provenance is invisible in the chat UI:

1. **Adapter only recognises two tool-part types.** `asToolPart`
   (`apps/web/src/features/chat/adapt.ts`) handles `dynamic-tool` and
   `tool-find_lawyers`. In AI SDK v5, server tools defined with `tool()` stream to
   the client as *static* `tool-<name>` parts, not `dynamic-tool` (`ai` sets
   `dynamic` only for `dynamicTool()`). Retrieval calls arrive as
   `tool-get_section`, `tool-search_document_sections`, etc., match neither
   branch, are filtered out, and `SourceSteps` never mounts. `find_lawyers`
   renders only because it is special-cased.
2. **Prefetch is invisible by design.** `prefetchSections` ranks the corpus
   server-side and injects sections into the system prompt — not a tool call, so
   it has no UI representation at all.

This adds a final, cited-only chip footer under each assistant answer, designed
to become a deep-link into the document reader later.

## Decisions

1. **Placement:** footer chip row under the assistant answer.
2. **Semantics:** cited-only — chips are the sections the model says it relied
   on, not everything retrieved.
3. **Mechanism:** a `cite` tool, input `{ nodeIds: string[] }`.
4. **Resolution:** `cite` resolves each `nodeId` → full ref, drops unknown ids,
   dedups preserving cite order.
5. **Storage:** new `references` JSON column on `chat_messages` is canonical; the
   `cite` result also carries the resolved refs so live rendering works before
   `onFinish` writes the column.
6. **Prefetch:** `renderPrefetchedContext` gains the `nodeId`, so prefetched
   sections are citable.
7. **Coexistence:** `SourceSteps` stays as the live "what is it reading" trail;
   chips coexist as the final sources row.
8. **Chip content:** label `§<identifier> · <heading>`, full `citation` as hover
   `title`; flat list, no grouping by document.
9. **Deep-link contract (built later, not this pass):**
   `/repo/<documentId>?node=<nodeId>`; display-only chips for now, but the ref
   payload carries `documentId` + `nodeId` so the click is an isolated change.

## Changes

### `packages/schema`

- `ZReference = { documentId, nodeId, identifier, heading, citation }`;
  `TReference`; export from `index.ts`.
- `chatMessages.references`: `text("references", { mode: "json" })` with
  `.$type<TReference[] & JsonValueOf<TReference[]>>()`, nullable.
- Extend `ZChatMessage` with a `references` override (json columns otherwise infer
  `JSONValue`, same trick as `toolCalls`).
- `pnpm --filter @vidhan/schema db:generate` → new `drizzle/*` migration; apply
  locally with `wrangler d1 migrations apply DB --local`.

### `apps/api`

- `documents/retrieval.ts`: add `resolveReferences(db, nodeIds)` → ordered,
  deduped `TReference[]` (joins `documents` for the title, drops misses).
- `ai/tools.ts`: add the `cite` tool (`nodeIds: z.array(z.string()).min(1)`)
  executing `resolveReferences`; add the `nodeId` line to
  `renderPrefetchedContext`.
- `ai/prompts.ts`: instruct the model to call `cite` once with every nodeId it
  relied on before its final answer.
- `routes/public/chat.ts`: in `onFinish`, pull the `cite` result from
  `toolResults` and write it to `references`; pass through
  `insertAssistantMessage`.
- `chat/index.ts`: `insertAssistantMessage` gains a `references` param
  (`toChatMessage` already spreads the row).

### `apps/web`

- `features/chat/adapt.ts` — prerequisite fix: make `asToolPart` recognise static
  `tool-<name>` parts generically (`/^tool-/`), not just `dynamic-tool` /
  `tool-find_lawyers`. Without this neither `SourceSteps` nor `cite` is readable.
  Read `cite` output into `TChatMessageView.references`; on reload, synthesize the
  cite part from the `references` column so one extraction path serves both.
- `types.ts`: add `TReference` + `references?` on the view.
- New `components/reference-chips.tsx`; render in `message-bubble.tsx` after
  content.

## Assumptions

- Bump `stopWhen` `stepCountIs(5)` → `6` to absorb the `cite` round-trip.
- Empty/absent `cite` → no footer, no error.
- Headings truncated via CSS; full citation on hover.

## Verification

```pwsh
pnpm --filter @vidhan/schema typecheck
pnpm --filter @vidhan/api typecheck
pnpm --filter @vidhan/web typecheck
pnpm --filter @vidhan/web build
```

Manual smoke against `pnpm dev:api` + `pnpm dev:web`: ask a topic question →
streamed answer → chip footer; reload `/chat?id=<id>` → chips persist; ask a
lawyer-seeking question → `SourceSteps` and the lawyer carousel still work.

## Not done

- Clickable chips and reader deep-link support (`?node=`), deferred.
- Grouping chips by document.
- Enforcing "was actually retrieved" on cited nodeIds (resolve-and-drop only).
