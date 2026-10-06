# Chat: final step must produce the answer

> Superseded: the two-phase turn (`chat-two-phase-turn.md`) replaces the
> closing-user-turn band-aid below with a separate, tool-free answer
> generation. Kept for the failure analysis.

## Problem

Two turns in a row ended with the model's last generation writing a plan
instead of the answer. The clearest case (session `043bd9e6`) used six model
steps — titles, summary, search, read, find_lawyers + cite + offer, then a
tools-off prose step — and the final step's text was the 88-character plan:

> "I found the relevant criminal provisions. Let me read the theft and punishment sections."

`onFinish`'s `event.text` is the **last step's text only** (the AI SDK passes
`finalStep.text` plus the full `steps` array), so the stored answer was exactly
that plan. The retrieval, lawyer search, `cite`, and support offer all worked.

## Decision

- The tools-off final step now sends the instruction as a **closing user turn**
  via `prepareStep`'s `messages` override, in addition to appending it to the
  system prompt. A closing user message is a far stronger signal to write prose
  than a system addendum, which the model had been ignoring.
- Temporary per-step diagnostics log `finishReason`, text/reasoning lengths, and
  tool names at error level (`[chat] steps`), since the observability store only
  captures `error`/`info`. Remove once final-step behavior is stable.

## Verification

A/B probe against `deepseek/deepseek-v4-flash` through OpenRouter with a
synthetic transcript ending in tool results, reasoning enabled:

- system-only instruction → 1,949 chars, finished `stop`.
- closing user turn → 2,671 chars, finished `stop`.

Both answered, so the probe did not reproduce the failure; the diagnostics will
show what the real final step emits on the next run.

## Not done

A deterministic fallback that generates the answer when the final step yields no
prose. Implement if the closing user turn does not hold: capture `await
result.steps`, and when the final step text is empty, run one tool-free
`generateText` with the closing instruction and stream/store that text.
