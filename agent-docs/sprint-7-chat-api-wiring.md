# Sprint 7 — Wire Chat UI to the Chat API

Scope: connect the web chat surface to the real chat backend. The chat UI
(`docs/sprint-6-chat-ui.md`) runs on an in-memory mock; the backend
(`docs/sprint-4-chat-api.md`) already streams, persists, and runs `find_lawyers`.
This sprint removes the mock and drives the UI from that API. **No RAG, no
citations, no new backend work.**

## Definition of done

- Sending a message streams the real assistant reply through `useChat`.
- `find_lawyers` invocations render the existing lawyer carousel from live data.
- A session is created server-side on first send and addressable at `/chat?id=<id>`.
- Reloading `/chat?id=<id>` restores the persisted history, including lawyer cards.
- The sidebar "Recent" list shows the user's real sessions.
- `pnpm --filter @vidhan/web typecheck`, `lint`, and `build` pass.

## Decisions

### Dependencies

- Add `ai` and `@ai-sdk/react` to `apps/web` (`@vidhan/schema` already shared).
- **Pin web's `ai` to the API's version (`^5.0.271`)** so both ends speak the same
  UI-message stream protocol. `@ai-sdk/react@^2` is the v5-compatible release.
- Both tarballs are already in the pnpm store, but `@ai-sdk/react` is not yet in
  `pnpm-lock.yaml`; `pnpm install` may need registry access.

### Session lifecycle

- The backend is the source of truth for sessions. `POST /chat/sessions` mints the
  id; the sidebar reads `GET /chat/sessions` (non-empty sessions only).
- **New chat:** on first send, create the session via REST, set the active id, then
  `router.replace('/chat?id=<id>')` and send. This keeps the first user turn — a
  remount-on-id approach would drop it.
- Session title is generated server-side in the stream's `onFinish`, so the session
  list is refetched once a turn completes.
- One `useChat` instance lives in `ChatView`; switching sessions calls
  `setMessages(history)` rather than remounting.

### Transport & auth

- `DefaultChatTransport` with `prepareSendMessagesRequest`:
  - reads the active session id from a ref (set before send), targeting
    `POST /chat/sessions/:id/messages`;
  - reshapes the body to `{ content: <last user text> }` — the backend's `ZChatSend`;
  - attaches `Authorization: Bearer <token>` from `readToken()` at request time.
- The token is read per request, so a rotated/refreshed token is picked up without
  re-instantiating the transport. No SSR concern — the transport is client-only.

### History reconstruction

- `GET /chat/sessions/:id` returns rows with `content` + parallel `toolCalls` /
  `toolResults` JSON arrays. Rebuild `UIMessage[]`:
  - user row → one text part;
  - assistant row → a text part (when present) plus a `dynamic-tool` part per
    call/result pair, `state: 'output-available'`, `output` = the stored
    `TLawyerSearchResult`.
- No client tool definitions are passed to `useChat`, so streamed tool calls arrive
  as `dynamic-tool` parts (`toolName: 'find_lawyers'`); the adapter also accepts
  `tool-find_lawyers` defensively.

### Rendering adapter

- Convert `UIMessage[] → TChatMessageView[]` so `MessageBubble` / `LawyerStep` /
  `LawyerResultCard` stay untouched:
  - text parts → `content`;
  - tool part `input-available` (no output) → `TLawyerSearch` with empty `lawyers`
    ("Searching for lawyers…");
  - tool part `output-available` → `TLawyerSearch` with `output.lawyers`.
- Status mapping: `submitted → thinking`, `streaming → streaming`,
  tool-without-output → `searching`, `ready → idle`.

### Markdown

- Real model output carries markdown. Render assistant text with `react-markdown` +
  `remark-gfm` (already dependencies) using `prose` classes; confirm
  `@tailwindcss/typography` is registered in `globals.css` (Tailwind 4 `@plugin`),
  else use a scoped fallback.
- User messages stay plain text.

### Errors

- On `useChat` error (including a 401 from the stream), show a small inline
  "Something went wrong" with a Retry action (`regenerate()`). No toast dependency.

### Retrieval feedback and stop (post-wiring)

- The streaming protocol emits `start-step` *before* server-side tool execution,
  while `tool-input-available`/`tool-output-available` only land *after* the tool
  runs. So while a retrieval tool executes, the client has only an empty
  `step-start` part — nothing to render.
- `deriveStatus`: while `streaming`, an assistant message with no text and no
  tool part yet stays `thinking`; once it has a tool/text part it becomes
  `searching` (pending `find_lawyers`) or `streaming`. This keeps the thinking
  dots visible until real output arrives instead of flashing an empty bubble.
- `MessageBubble` renders the thinking dots independently of content, so the
  dots coexist with the retrieval-steps panel rather than being replaced by it.
- Retrieval tools (`list_documents`, `search_documents`,
  `get_document_outline`, `get_section`) surface as a `SourceSteps` trail
  (label + running/done), deduped by `toolCallId`; `get_section` also shows the
  fetched heading. `find_lawyers` keeps its own `LawyerStep` card.
- Stop: aborting leaves the partial assistant turn in the transcript, and an
  "Edit message" button restores the last user turn into the composer.

### Retrieval performance and payloads

- See `docs/chat-retrieval-fts.md`. Summary: FTS5 index over `document_nodes`,
  compact/filtered outlines, bounded sections, a server-side prefetch injected
  into the system prompt, and a tighter tool/step budget. `documents/retrieval.ts`
  holds the agent-facing reads; the reader's public `/docs/:id/outline` shape is
  unchanged.

## Module layout

```
apps/web/src/features/chat/
├── api.ts          # createSession, listSessions, getSession (Bearer JWT)
├── store.tsx       # ChatProvider + useChat(): session list, createSession, refresh
├── types.ts        # view models (unchanged) + adapter types
├── adapt.ts        # UIMessage <-> view model + history reconstruction
└── components/
    ├── chat-view.tsx      # owns the AI SDK useChat instance; send/stop/status
    ├── message-bubble.tsx # + markdown for assistant turns
    └── (unchanged) message-list, chat-composer, chat-empty, thinking-dots,
        lawyer-step, lawyer-result-card

apps/web/src/components/app-sidebar.tsx  # recent list from useChat().sessions
apps/web/src/lib/lawyers.ts              # remove MOCK_LAWYERS/MOCK_LAWYER_IDS
apps/web/src/features/chat/mock.ts       # deleted
```

`mock.ts` and `MOCK_LAWYERS` / `MOCK_LAWYER_IDS` are only used by the chat preview;
`LAWYER_IDS` stays to back the static `/lawyers/[id]` routes.

## Verification

```pwsh
pnpm --filter @vidhan/web typecheck
pnpm --filter @vidhan/web lint
pnpm --filter @vidhan/web build
```

Manual smoke against `pnpm dev:api` + `pnpm dev:web`: login → new chat → ask a
lawyer-seeking question → streamed reply → "Searching…" → lawyer carousel → Book
call / View profile resolve → reload `/chat?id=<id>` restores history and cards →
sidebar lists the session → Stop aborts mid-stream → API/model failure shows the
inline error.

## Out of scope

- RAG / citations / document grounding.
- Session rename or delete UI.
- Chat-type chip behavior (research vs enquiry).
- Multi-tab streaming, resumable streams, reconnect.
- Backend changes of any kind.
