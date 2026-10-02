# Sprint 4 — Chat API (Auth + Sessions + Lawyer Tool)

Scope: the chat backend. End-user auth, chat sessions/history, and the `find_lawyers` tool call. **No UI, no RAG, no documents.** The chat route is the only place tool calling exists this sprint.

## Definition of done

- Auth routes work: register / login / me (JWT).
- Chat sessions + message history persist per user.
- A user can ask "find me a lawyer for my issue" and the response streams, invokes `find_lawyers`, and the tool invocation + result are persisted on the assistant message.
- `pnpm typecheck` passes; manual smoke against `dev:api` confirms the tool fires.

## Decisions

### Provider & models

- **OpenRouter** via `@ai-sdk/openai-compatible`. `OPENROUTER_BASE_URL` + model names are env vars, so any OpenAI-compatible backend (Groq, local Ollama, paid OpenRouter) swaps with no code change.
- Two models: `CHAT_MODEL` (capable, the chat turn) and `TITLE_MODEL` (cheap, session title generation). No other AI jobs this sprint.
- Testing is free: OpenRouter `:free` models, or Groq/Ollama — pure env swap.

### Streaming protocol

- **AI SDK v5 data stream** (`toUIMessageStreamResponse()`), not hand-rolled SSE. The protocol already carries tool invocations as structured parts, and the future web UI's `useChat` consumes it natively. Hand-rolling SSE would lose `useChat` compatibility and force re-implementing chunk framing.
- Trade-off accepted: the frontend is coupled to the AI SDK protocol. Fine — UI is not built yet and will use the SDK.

### Auth

- **JWT HS256**, `JWT_SECRET` env, payload `{ sub: userId, iat, exp }`, **7-day expiry**, no refresh tokens (re-login on expiry).
- **PBKDF2-SHA256** via Web Crypto (native on Workers, no deps), per-user random salt, 100k iterations, stored `pbkdf2$<iterations>$<salt>$<hash>`, timing-safe compare.
- Chat only occurs when logged in — no anonymous sessions. Chat routes sit behind a `requireAuth` middleware separate from the admin Basic guard.
- **No roles / email verification / avatars** this sprint. `district` and `language` are nullable/defaulted so registration stays frictionless and the profile fills in later.

### User profile

- Minimal: `id`, `email` (unique), `passwordHash`, `name`, `district`, `language`, timestamps.
- `district` (enum `DISTRICTS`, nullable) feeds lawyer matching later; `language` (enum `LANGUAGES`, default `en`) is the chat language preference. More fields later — no migration rework expected.

### Chat schema

- Two tables: `chat_sessions` (`id`, `userId`, `title`, timestamps) and `chat_messages` (`id`, `sessionId`, `role`, `content`, `toolCalls` JSON, `toolResults` JSON, `createdAt`).
- **Tool-call data stored as JSON on the assistant message**, mirroring the AI SDK's `toolInvocations` shape so history round-trips back into `streamText`'s `messages` array without lossy reconstruction. No separate `tool_calls` table.
- **Session title derived server-side** from the first user message via `TITLE_MODEL` (cheap), not truncated text.
- Indexes: `(user_id, updated_at)` on sessions, `(session_id, created_at)` on messages.

### Chat routes

Explicit session creation so the streaming route does one job and the sidebar's "New chat" maps 1:1:

- `POST /chat/sessions` → `{ session }`
- `GET /chat/sessions` → `{ sessions }` — **only sessions with ≥1 message**, so empty "New chat" rows don't clutter the sidebar
- `GET /chat/sessions/:id` → `{ session, messages }` — owner-scoped, `404` otherwise
- `DELETE /chat/sessions/:id`
- `POST /chat/sessions/:id/messages` `{ content }` → streams the assistant response

### `find_lawyers` tool

- Input: `practiceAreas: array(enum(PRACTICE_AREAS))`, `district?: enum(DISTRICTS)`, `language?: enum(LANGUAGES)`, `reason: string` (rationale — useful for the UI later and forces the model to justify).
- Execute: reuses `searchLawyers` (`apps/api/src/lawyers/index.ts`) with `limit: 5`, `offset: 0`, returning the curated `TPublicLawyer[]` (no `barNumber`/flags/timestamps).
- **Cap of 5** results per call — enough to summarize, lean enough for context.
- **Empty result returns `meta.districtCounts`** so the model can suggest nearby districts in the same turn instead of a dead end.
- The raw `TPublicLawyer[]` flows through the stream via tool invocations, so the UI can render cards later.

### Persistence timing (Workers gotcha)

- **User message persisted synchronously** before `streamText` — a failed AI call still keeps the user's turn.
- **Assistant message persisted in `onFinish`**, wrapped in `c.executionCtx.waitUntil(...)`. Once the stream's last chunk flushes, the request context can be torn down before the write completes; `waitUntil` keeps the isolate alive.

### Module layout

Feature-based, per `AGENTS §5`:

```
packages/schema/src/db/schema.ts   # + users, chat_sessions, chat_messages tables & Z/T schemas

apps/api/src/
├── auth/
│   └── index.ts        # register, login, verifyJwt, hashPassword, requireAuth middleware
├── chat/
│   └── index.ts        # session CRUD + message persistence
├── ai/
│   ├── client.ts       # OpenRouter provider (AI SDK) from env
│   ├── prompts.ts      # system prompt for the legal assistant
│   └── tools.ts        # find_lawyers tool def → calls searchLawyers
└── routes/public/
    ├── auth.ts         # /auth/register, /auth/login, /auth/me
    └── chat.ts         # /chat/sessions, /chat/sessions/:id/messages (streaming)
```

`searchLawyers` is reused unchanged — its curated `TPublicLawyer` projection is already the tool's result shape.

## API contract

**Auth** (public)

- `POST /auth/register` `{ email, password, name }` → `{ token, user }`; `409 duplicate_email`.
- `POST /auth/login` `{ email, password }` → `{ token, user }`; `401 unauthorized`.
- `GET /auth/me` (guarded) → `{ user }`.
- `PATCH /auth/me` (guarded) `{ name?, district?, language? }` → `{ user }`.

**Chat** (guarded, Bearer JWT)

- `POST /chat/sessions` → `{ session }`.
- `GET /chat/sessions` → `{ sessions }` (non-empty only).
- `GET /chat/sessions/:id` → `{ session, messages }`; `404` if not owner.
- `DELETE /chat/sessions/:id` → `{ ok: true }`.
- `POST /chat/sessions/:id/messages` `{ content }` → AI SDK v5 data stream; persists user + assistant messages.

Error envelope unchanged: `{ error, details? }` — `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 duplicate_email`, `500 internal_error`.

## Config

- `apps/api/package.json`: add `ai` (v5), `@ai-sdk/openai-compatible`.
- `Env` gains: `JWT_SECRET`, `OPENROUTER_BASE_URL`, `CHAT_MODEL`, `TITLE_MODEL`.
- `wrangler.toml` `[vars]`: `OPENROUTER_BASE_URL`, `CHAT_MODEL`, `TITLE_MODEL` (placeholders). `JWT_SECRET` + `OPENROUTER_API_KEY` via `wrangler secret put`.
- `.dev.vars`: local `JWT_SECRET` + OpenRouter key + `:free` model names.

## Verification

```pwsh
pnpm --filter @vidhan/schema db:generate
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
pnpm --filter @vidhan/api db:seed:load
pnpm typecheck
pnpm dev:api
```

Manual smoke: register → login → `POST /chat/sessions` → send "I need a property lawyer in Kathmandu" → confirm streamed answer, `find_lawyers` invocation in the stream, and the assistant row persisted with `toolCalls`/`toolResults`.

## Out of scope

- RAG / embeddings / Vectorize / citations.
- Document ingest and repo (documents untouched).
- Any UI (web chat screen, lawyer cards).
- Refresh tokens, roles, email verification, lawyer booking flow.
