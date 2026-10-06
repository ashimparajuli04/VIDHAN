# Chat: find_lawyers rejected on the final step

## Problem

A "someone stole from my home" turn ended with "Could not search for lawyers."
The model called `find_lawyers` on the last step (after `cite`) with:

```json
{ "practiceAreas": ["criminal"], "district": "bhaktapur" }
```

`reason` was required by the input schema but unused by the server. The AI SDK
rejected the input before `execute` ran (`tool-input-error` → UI part state
`output-error`), so no tool result was stored and the web app rendered its
generic failure message. The turn ran on the last step, where `toolChoice:
"none"` was supposed to disable tools — this provider ignores that, which is
also why the call was rushed and incomplete.

## Decision

- `reason` is now optional in `find_lawyers` (schema and `TFindLawyersInput`).
  Nothing reads it; requiring it only created a failure point. With it
  optional, the exact call executes and returns zero Bhaktapur lawyers plus
  `meta.districtCounts` (Lalitpur has the nearest criminal lawyers).
- The final prose step now sets `activeTools: []` in addition to `toolChoice:
  "none"`. The OpenAI-compatible provider turns an empty tool list into
  `tools: undefined` / `tool_choice: undefined`, so no tool schema reaches the
  provider and a half-formed call cannot be emitted there.

Not done: distinguishing invalid-input errors from execution errors in
`LawyerStep`, and a `repairToolCall` hook for enum slips. Both only matter if a
malformed call recurs; `reason` optional removes the observed one.

## Verification

- Observed payload against the real schema: `missing reason -> true` now
  (previously `false`); `with reason -> true` unchanged.
- `searchLawyers(["criminal"], ["bhaktapur"])` → 0 lawyers,
  `districtCounts.lalitpur = 2`.
- `pnpm --filter @vidhan/api typecheck` clean.
