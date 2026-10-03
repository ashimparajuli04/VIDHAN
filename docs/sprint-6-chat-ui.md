# Sprint 6 — Chat UI (Mock) + Chat Lawyer Card

Scope: the web app's chat surface and the compact lawyer card that renders inside a
reply. **UI only — no API wiring, no persistence, no RAG, no citations.** The backend
chat already exists (`docs/sprint-4-chat-api.md`); this sprint builds the screen that
will consume it, against a faked stream.

## Definition of done

- `/chat` renders a new-chat hero (type chip + suggestion chips) and an interactive composer.
- Sending fakes the full turn: thinking dots → word-by-word text → "Searching for lawyers…" → lawyer carousel.
- Assistant replies can carry a horizontal carousel of compact lawyer cards.
- A session is addressable at `/chat?id=<id>`; a new chat mints an id on first send.
- `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @vidhan/web build` pass.

## Decisions

### Demo behavior

- **Interactive mock, faked stream.** Send works end to end; the assistant turn is a
  canned script driven by timers. Stop aborts mid-stream. The store's async
  `sendMessage` is the single seam — swap its mock body for the AI SDK `useChat`
  wiring when the API is connected.
- **Choreography:** brief thinking dots → stream the canned text word-by-word (~1.5s)
  → "Searching for lawyers…" (collapsible, expands to the mock query) → labeled
  carousel of 3 cards. Keyword-triggered cards; generic canned legal answer otherwise.

### Routing

- **One static route `/chat`; active session via `?id=`.** No `/chat/[id]` — the app is
  `output: "export"`, so a dynamic segment would need build-known ids. A query param
  keeps runtime-minted ids refresh-safe (the host always serves `/chat`).
- New chat = `/chat` (no id). First send mints an id and `router.replace('/chat?id=<id>')`.
- `chat/page.tsx` is a server shell wrapping the client view in `<Suspense>` —
  `useSearchParams` requires it under static export.
- Sidebar links change from `/chat/<id>` to `/chat?id=<id>` **only**; the list stays
  hardcoded and the "..." menu stays inert.

### State

- **`ChatProvider` + `useChat()`** in `apps/web/src/features/chat/`, mounted in
  `(app)/layout.tsx` so it survives client navigation between `?id=` values.
- **In-memory only** — a refresh resets to the seed sessions. No `localStorage`.
- Holds sessions, active messages, streaming status, and the current mock tool step.

### Rendering

- **Plain text** (`whitespace-pre-wrap`), no markdown dependency. The faked content is
  authored to read well as plain text; a markdown renderer is a self-contained swap
  when the API lands.
- **Both bubbles with avatars** — user right (initial, `User` fallback), assistant left
  (`Scale` mark).
- **Composer:** autosize textarea, Enter sends / Shift+Enter newlines, send disabled
  when empty or streaming, Stop button aborts, "Vidhan guides, lawyers advise"
  disclaimer under it.
- **Empty state:** centered hero + 4 suggestion chips + a research/enquiry type chip.
  The chip is **visual only** (default from `user.isResearcher`); no behavior, no
  immutability logic — that is a later slice.
- **Scroll:** smart auto-scroll while near the bottom; stop and show "Jump to latest"
  once the user scrolls up.
- **No chat header.** The session title lives only in the sidebar.

### Chat lawyer card

- Compact, distinct from the catalogue card (different content + CTA, carousel item,
  no bio/badges) → new `lawyer-result-card.tsx`, not an extension.
- **Contents:** photo (`imageUrl`, `PigAvatar` fallback), name, years of experience,
  **Book call** CTA, **View profile** link.
- `bookingUrl` present → CTA links out (new tab). Null → disabled "Booking coming
  soon", matching `/lawyers/[id]`.
- "View profile" links to `/lawyers/[id]`; ids come from `MOCK_LAWYERS`
  (`apps/web/src/lib/lawyers.ts`), which already backs the static detail routes.
- **hover-card** preview on hover (desktop); ignored on touch.
- Layout is a **horizontal carousel** (`shadcn carousel` + `embla-carousel-react`),
  up to 5 cards, mock returns 3.

### UI components

- Add shadcn `carousel`, `textarea`, `avatar`, `scroll-area`, `collapsible`, `hover-card`.
  Pulls `embla-carousel-react`.
- The repo uses the unified `radix-ui` package; confirm the CLI emits matching imports
  and does not clobber `globals.css`.
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`, …).

## Module layout

```
apps/web/src/features/chat/
├── types.ts        # TChatSessionView, TChatMessageView (UI view models)
├── mock.ts         # seed sessions, canned replies, keyword heuristic, scripted chips
├── store.tsx       # ChatProvider + useChat() — in-memory; sendMessage/stop seam
└── components/
    ├── chat-view.tsx          # reads ?id, orchestrates list + composer
    ├── message-list.tsx       # ScrollArea, auto-scroll, jump-to-latest
    ├── message-bubble.tsx     # user/assistant bubble + avatar
    ├── chat-composer.tsx      # textarea + send/stop + disclaimer
    ├── chat-empty.tsx         # hero + type chip + suggestion chips
    ├── thinking-dots.tsx
    ├── lawyer-step.tsx        # collapsible status + carousel
    └── lawyer-result-card.tsx # the chat lawyer card

apps/web/src/app/(app)/chat/page.tsx   # server shell + <Suspense><ChatView/></Suspense>
apps/web/src/components/app-sidebar.tsx # hrefs only: /chat?id=<id>
apps/web/src/components/ui/            # + carousel, textarea, avatar, scroll-area,
                                       #   collapsible, hover-card
```

## Verification

```pwsh
pnpm --filter @vidhan/web typecheck
pnpm --filter @vidhan/web lint
pnpm --filter @vidhan/web build
```

Manual smoke: open `/chat` → type chip + chips render → click a lawyer-seeking chip →
thinking → streamed text → "Searching…" → carousel → Book call + View profile resolve →
Stop aborts mid-stream → new chat URL becomes `/chat?id=<minted>` → sidebar recent chat
opens `/chat?id=<seed>` with its history.

## Out of scope

- API wiring, `useChat`/`ai` deps, persistence, `localStorage`.
- Markdown rendering, citations, RAG events.
- Chat-type chip behavior (research vs enquiry prompt branch, immutability).
- Sidebar store wiring, rename/delete, session management UI beyond URL minting.
- `/chat/[id]` dynamic route.

## Findings (not fixed)

- `apps/web/src/features/lawyers/components/LawyerCard.tsx` is an unused duplicate of
  `apps/web/src/components/lawyers/lawyer-card.tsx`.

## Follow-ups (post-sprint)

- **Mode toggle (composer).** `TChatMode = "general" | "research"` lives in the chat store,
  defaulting from `user.isResearcher`. The composer's disclaimer row shows a right-aligned
  "Vidhan - General / Research" text toggle (`aria-pressed`); the empty-state chip reads the
  same store value. Terminology unified on **General** (was "Enquiry"). In-memory only,
  still mock-era — no API branch yet.
