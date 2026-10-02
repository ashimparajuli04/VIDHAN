# Sprint 5 — Web Auth (Login + Multi-step Register)

Scope: the web app's authentication surface. Login, a multi-step register, route
guarding, and the client-side auth module. Plus the small backend additions
(`district` + `isResearcher` on register) they depend on. **No chat-type chip, no
OTP, no password reset, no profile screen.**

## Definition of done

- `/login` and `/register` render, themed with the shared shadcn components.
- Register is a 3-step single-route flow; account is created on the final step.
- Every app route is guarded; logged-out users redirect to `/login?next=<path>`.
- Sidebar shows the real user; Sign out clears the session.
- `isResearcher` + `district` persist through register and round-trip via `/auth/me`.
- `pnpm typecheck` passes; manual smoke covers register → land `/chat` → refresh → logout.

## Decisions

### Token storage

- **`localStorage`** under `vidhan:token`. Hackathon call: `output: "export"` means no
  server, so no httpOnly cookie is possible from the app. XSS = token theft; accepted
  for now. Mirrors the admin app's localStorage pattern.
- **Deferred:** nonce/CSP hardening, refresh tokens, `sessionStorage`/in-memory split.

### Auth state

- **`AuthProvider` context + `useAuth()`** in `apps/web/src/features/auth/`.
- Exposes `{ user, status, login, register, logout }`, `status ∈
  loading | authenticated | unauthenticated`.
- On mount: read token → `GET /auth/me` to validate + hydrate. Invalid/expired →
  clear token → `unauthenticated`.

### Route guarding

- Client-side only (static export). A `RequireAuth` wrapper renders a full-shell
  skeleton while `loading`, redirects to `/login?next=<pathname>` when `unauthenticated`.
- **All app routes guarded** (`/chat`, `/lawyers`, `/repo`, `/`). Only `/login`,
  `/register`, `/terms`, `/privacy` are public.
- Post-auth landing: `?next` if present, else `/chat`.

### Route groups

- Restructure `src/app` into:
  - `(app)/` — guarded pages, wrapped in the `AppShell` (sidebar + chrome).
  - `(auth)/` — login / register / terms / privacy; **no sidebar**, bare centered layout.
- Motivation: the guard boundary and the chrome boundary are the same boundary; a route
  group expresses it without conditional sidebar rendering.

### Register flow

- **Single route `/register`, local `step` state** — not separate URLs. No cross-route
  state plumbing, no partial account on the server, back/forward is trivial.
- **3 steps:**
  1. **Account** — name, email, password, confirm password (match is client-only; API has
     no confirm field).
  2. **Profile** — district (select from `DISTRICTS`), `isResearcher` toggle.
  3. **Terms** — consent checkbox gating submission; links to `/terms` + `/privacy`.
- Step 1/2 validated before advancing via a register form schema derived from
  `ZAuthRegister`. Final submit serializes all fields.
- **Auto-login on success** — the API returns `{ token, user }`, so register stores the
  token and lands the user directly (no bounce to `/login`).
- A possible 4th **OTP verification** step is noted but **not planned**.

### Login flow

- Email + password (show/hide toggle), react-hook-form + `ZAuthLogin`.
- **No "remember me"** — localStorage always persists, so a remember-me that does nothing
  is worse than none.
- Errors: `unauthorized` → "Invalid email or password." (single message, no account
  enumeration); network → generic banner.

### `isResearcher` and chat type (documented, not built)

- `isResearcher` (boolean on `users`) seeds the **default chat-type chip** on a new chat:
  researcher → **research**, else **enquiry**. The user may change it, but once the chat
  starts the type is **persisted and immutable** for that session.
- Behaviour when built: **research** chats skip escalation assessment and lawyer
  suggestion; **enquiry** chats assess escalation and decide whether to suggest a lawyer.
- **Not implemented this sprint.** Persisting the flag now is the whole point; the chip and
  prompt branch are the next sprint's work.

### Backend additions

- `users` gains `is_researcher INTEGER NOT NULL DEFAULT 0` (Drizzle migration).
- `ZAuthRegister` gains `district: z.enum(DISTRICTS).nullable().default(null)` and
  `isResearcher: z.boolean().default(false)`; register persists both instead of hardcoding
  `district: null`.
- `ZAuthUpdate` gains `isResearcher: z.boolean().optional()`; `PATCH /auth/me` applies it.
- `ZPublicUser` derives from `ZUser.omit({ passwordHash })`, so both fields reach the
  client automatically; `toPublicUser` maps `isResearcher`.

### UI components

- Add shadcn `label`, `form`, `field`. Pulls `react-hook-form` + `@hookform/resolvers`
  (zod already present transitively). Chosen over hand-rolled `useState` forms for
  per-field error ergonomics and a11y wiring.
- **Semantic tokens only** — `bg-card`, `text-muted-foreground`, `border-border`,
  `text-destructive`, `bg-background`. No raw palette classes (`red-500`, `slate-300`, …).

### Terms & privacy

- **Real short policies authored in-repo** for the hackathon, rendered at `/terms` and
  `/privacy`, linked from register step 3.

## Schema / module layout

```
packages/schema/src/db/schema.ts       # + users.isResearcher, ZAuthRegister/Update fields
packages/schema/drizzle/<migration>/   # generated

apps/api/src/auth/index.ts             # toPublicUser maps isResearcher
apps/api/src/routes/public/auth.ts     # register + patch me persist the new fields

apps/web/src/
├── features/auth/
│   ├── types.ts        # TAuthStatus, TAuthContextValue
│   ├── storage.ts      # vidhan:token read/write/clear
│   ├── api.ts          # login, register, fetchMe + typed ApiError
│   ├── provider.tsx    # AuthProvider + useAuth
│   └── guard.tsx       # RequireAuth
├── components/ui/      # + label, form, field
└── app/
    ├── (app)/          # guarded: chat, lawyers, repo, root
    └── (auth)/         # public: login, register, terms, privacy
```

## API contract (unchanged paths, extended bodies)

- `POST /auth/register` `{ email, password, name, district?, isResearcher? }` →
  `{ token, user }`; `409 duplicate_email`.
- `PATCH /auth/me` adds `isResearcher?`; response `user` now includes `district` +
  `isResearcher`.
- Error envelope unchanged: `{ error, details? }`.

## Verification

```pwsh
pnpm --filter @vidhan/schema db:generate
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
pnpm typecheck
pnpm lint
```

Manual smoke: register (3 steps, including district + researcher) → land `/chat` with the
real user in the sidebar → refresh stays authed → visit `/chat` logged-out redirects to
`/login?next=/chat` → login returns to `next` → duplicate email and bad password show
friendly copy → Sign out clears the session → `/auth/me` reflects the new fields.

## Out of scope

- Chat-type chip and its prompt branch (research vs enquiry) — next sprint.
- OTP / email verification, password reset, roles.
- Profile/account-settings screen.
- CSP / nonce hardening, refresh tokens, cross-tab logout sync.
