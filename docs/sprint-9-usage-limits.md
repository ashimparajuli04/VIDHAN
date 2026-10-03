# Sprint 9 — Usage Limits & Subscription Gating

Scope: meter per-user token consumption, cap it per day, gate chat when the cap
is hit, expose a usage page, and let admin flip `isSubscribed`. No payment
gateway — subscription is an admin-only flag this sprint.

## Definition of done

- A free user has a daily token limit; a subscribed user has a larger one.
- `/usage` shows the user how much of the limit they have used, as a %.
- When the limit is crossed, sending is blocked server-side and the composer is
  disabled client-side, with a banner above it:
  `Your session limit is over. Session usage will be reset in 6h 15m.`
- Admin can toggle a user's subscription from a `/users` page.
- `pnpm --filter @vidhan/schema db:generate`, `pnpm typecheck`, and `pnpm lint` pass.

## Decisions

### Metering

- Count `inputTokens + outputTokens`, summed across every `streamText` step in a
  chat turn (`event.totalUsage` in `onFinish`). Some fields may be `undefined`;
  fall back to `0` for missing parts.
- The title-generation `generateText` call is **excluded** — it is a cheap
  side-call, not a chat turn.

### Storage

- New `user_usage` table: one row per `(userId, date)`, `tokens` counter.
- `addUsage` uses an atomic `onConflictDoUpdate` (`tokens = tokens + n`) so
  concurrent turns can't clobber each other's increment.
- The daily row boundary *is* the reset — no rollover logic, no cleanup job.

### Reset boundary

- Nepal local midnight (Asia/Kathmandu, UTC+5:45). The day key is the NPT
  calendar date; `resetAt` is the next NPT midnight as ISO.
- Offset is a fixed constant (Nepal has no DST), so this is a plain shift.
- UTC midnight was rejected: a Nepali user's quota would reset at 5:45 AM local.

### Limits

- `USAGE_LIMITS = { free: 100_000, subscribed: 1_000_000 }` in `@vidhan/schema`,
  imported by both API and web so the % math can't drift.
- A retrieval-heavy turn realistically burns 20k–60k tokens, so free ≈ 2–4
  turns/day, subscribed ≈ 20+.

### Enforcement

- Pre-flight check at the top of `POST /chat/sessions/:id/messages`. If
  `used >= limit`, return **HTTP 429** with:
  `{ error: "usage_limit_exceeded", used, limit, resetAt, isSubscribed }`.
- Session creation and history reads stay allowed — only sending is blocked, so
  users can still open past chats.
- Client-only gating rejected (bypassable via curl); it is the paid-tier gate.

### Usage state on the client

- `GET /usage` returns `{ used, limit, resetAt, isSubscribed }`, surfaced through
  a `UsageProvider` context (mirrors `AuthProvider`).
- Fetched on app load, refreshed after each completed turn, and as a backstop
  when a send errors (429).
- `isSubscribed` is **not** added to `TPublicUser`; plan/usage state has one
  owner. Admin reads it via `ZAdminUser`.

### Usage page

- New `/usage` route in the web `(app)` group + sidebar nav entry (gauge icon).
- Shows: plan badge (Free / Subscribed), progress bar with % used,
  `used / limit`, and a reset countdown.
- A persistent sidebar meter is a follow-up, not this sprint.

### Admin

- New `/users` admin page + `GET /admin/users` (paginated, search by email/name)
  and `PATCH /admin/users/:id` to set `isSubscribed`. Reuses the existing
  Basic-auth admin middleware.
- No admin users surface exists today, so this is a new page rather than a
  toggle bolted onto an unrelated page.

### Banner

- Copy: `Your session limit is over. Session usage will be reset in 6h 15m.`
- Countdown derives from `resetAt` as hours + minutes, ticking live. Hours-only
  was rejected because it reads "6 hours" anywhere in the 6th hour.

### Known limitation

- Tokens are only known at turn end, so usage is written in `onFinish` via
  `waitUntil`. Two concurrent sends (e.g. two sessions) can both pass the
  pre-flight check before either write lands, slightly overshooting the cap.
  Bounded and self-correcting on the next request; accepted for the hackathon.

## Module layout

```
packages/schema/src/db/schema.ts   # isSubscribed column, userUsage table,
                                   # USAGE_LIMITS, ZUsage, ZAdminUser, update schemas

apps/api/src/usage/index.ts        # nptDate, nptResetAt, getUsage, addUsage, isOverLimit
apps/api/src/routes/public/usage.ts  # GET /usage
apps/api/src/routes/public/chat.ts   # pre-flight 429 + onFinish usage write
apps/api/src/routes/admin/users.ts   # GET /admin/users, PATCH /admin/users/:id

apps/web/src/features/usage/
├── api.ts        # getUsage (Bearer JWT)
├── types.ts      # TUsage re-export + countdown helpers
└── provider.tsx  # UsageProvider + useUsage()
apps/web/src/app/(app)/usage/page.tsx
apps/web/src/components/app-sidebar.tsx            # /usage nav item
apps/web/src/features/chat/components/chat-composer.tsx  # disabled state + banner
apps/web/src/features/chat/components/chat-view.tsx      # refresh usage on finish
```

## Verification

```pwsh
pnpm --filter @vidhan/schema db:generate
pnpm typecheck
pnpm lint
```

Manual smoke: free user sends turns until the cap → composer disables and the
banner counts down → admin toggles `isSubscribed` on `/users` → limit jumps to
1M and chat resumes → usage resets at NPT midnight.

## Out of scope

- Payment gateway / real billing.
- Per-session (rather than per-user) limits.
- Persistent sidebar usage meter.
- Usage history charts / analytics.
- Research vs general mode having separate limits.
