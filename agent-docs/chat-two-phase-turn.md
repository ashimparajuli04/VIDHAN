# Chat: two-phase turn (tools, then a separate answer)

## Problem

The model's working narration leaked into the answer. A single `streamText`
call concatenates the text of **every** step into the assistant message, so
planning chatter emitted while calling tools ("Let me check its contents",
"Now let me read the two theft provisions") became part of the stored answer
and the bubble. The earlier closing-user-turn fix (`chat-final-answer-step.md`)
only nudged the **final** step; it could not remove narration from the earlier
tool steps, and a live theft turn reproduced the leak.

Related gap from the same turn: when `find_lawyers` returned no lawyers, the
model called `offer_support_ticket` but the prose never told the user they
could request a lawyer, and the offer card read as a generic "Report this to
the team?".

## Decision

Split the turn into two model phases inside one `createUIMessageStream`, so the
client still renders one assistant message containing every part:

1. **Tool phase** — `streamText` with the full tool set, `stopWhen:
   stepCountIs(7)`, the existing step-1 tool narrowing, and a forced `cite` on
   the last step if it is still missing. Its UI chunks stream live, but **text
   chunks are dropped** (`pipePhase(..., keepText: false)`). Phase-1 text is
   never shown or stored, so narration cannot leak no matter what the model
   writes.
2. **Answer phase** — a second, tool-free `streamText`. Its text is the only
   text that reaches the bubble and the database. With no tools offered, the
   model cannot express a retrieval urge as a leaked tool-call block; prose is
   the only thing it can emit.

The answer phase receives `[...messages, ...phaseOneMessages, closing turn]`.
`result.response.messages` is the **final step only** (verified in the SDK:
`get response() { return this.finalStep.response }`), so the conversation is
rebuilt from every step's `step.response.messages`. The new
`chatAnswerSystemPrompt` carries the answering half of the system prompt: cite
verbatim, surface lawyers and any support offer, never invent.

If the first answer attempt strips to empty, one repair attempt runs with a
reinforced instruction — the deterministic fallback the old doc listed as
"not done", now cheap because it only runs on failure.

Stream lifecycle: phase 1 emits the single `start`; every sub-stream suppresses
`finish`; one manual `{ type: "finish" }` closes the message after the last
attempt. Persistence moved out of `streamText.onFinish` into the `execute`
closure, aggregating phase-1 tool calls/results/references with the answer text
and summed usage.

### Working context and chain-of-thought are not user-facing

Two leaks closed after the first two-phase ship:

- **Answer context.** Phase 2 was handed every step's `response.messages`,
  which include the assistant's reasoning and narration — deliberation about
  the system prompt and tool availability ("I don't have find_lawyers available
  in this environment"). That primed the answer model with exactly the leak we
  were removing. `workingTranscript()` now drops text and reasoning parts from
  assistant messages, keeping only tool calls and their results.
- **UI.** Reasoning is no longer streamed (`sendReasoning: false` in both
  phases) and the web ignores it both live (`toMessageView`) and on reload
  (`historyToMessages`). Raw CoT cannot be sanitized reliably, so it is never
  shown; the "Vidhan is thinking…" indicator still comes from the stream status.
  The `reasoning` column is still written for backend debugging.
- **Prompts.** Research mode no longer says "find_lawyers is unavailable" — a
  tool the model cannot see needs no mention, and naming it was the trigger for
  the deliberation. The answer prompt carries the hard rule: never mention
  instructions, system prompt, tools, or process; if something is not possible,
  answer naturally with what is available.

### Missing-lawyer surfacing

- Phase-1 prompt names the categories explicitly (`missing_lawyer` when
  `find_lawyers` returned no lawyers, `missing_document` when a provision was
  not found) so the offer is filed reliably.
- The answer prompt tells the model to point at a support offer when one was
  made, so the prose says the user can request a lawyer instead of only
  listing other districts.
- `SupportOfferCard` uses category-aware copy: "Request a lawyer in your
  district?" / "Request a lawyer" for `missing_lawyer`.

## Files

- `apps/api/src/routes/public/chat.ts` — two-phase orchestration
- `apps/api/src/ai/prompts.ts` — `chatAnswerSystemPrompt`, phase-1 prompt tweaks
- `apps/api/src/ai/index.ts` — export
- `apps/web/src/features/chat/components/support-offer-card.tsx` — offer copy

## Verification

- `pnpm nx run-many -t typecheck -p api,web` passes.
- Per-step diagnostics log both phases at error level
  (`[chat] tool phase steps`, `[chat] answer phase steps`) with `finishReason`,
  text/reasoning lengths, and tool names, so one rerun shows whether the
  answer phase always produces prose.
