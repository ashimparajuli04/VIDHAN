# Sprint 3 — Admin UI (Lawyer Management)

Scope: the `apps/admin` interface over the Sprint 2 lawyers API. **Read + toggle only** — list, search/filter, and inline `verified` / `active` switches. Create/edit forms, document repo, and the web app are **out of scope**.

## Decisions

- **Single-page-per-route, static export.** `/login` (credential gate) + `/lawyers` (list). Per-row detail/edit can't be a dynamic route — `output: "export"` needs `generateStaticParams` at build time and lawyer ids only exist at runtime. Any future detail view uses client state, not a URL segment.
- **Auth = HTTP Basic against API env.** Replaces the `ADMIN_TOKEN` bearer from Sprint 2. API env gains `ADMIN_USERNAME` / `ADMIN_PASSWORD` (Worker secrets); the guard parses `Authorization: Basic` and timing-safe compares both fields. The UI login screen stores `user:pass` in `localStorage` and sends Basic on every request. Reason: the admin app is a static bundle, so the browser can't be the auth boundary — the API must be. No login endpoint, no session token.
- **Tailwind v4 in `apps/admin` only.** Matches "Tailwind is primary"; smallest setup for a table + toggles. Web app untouched.
- **TanStack Query** for list cache + optimistic toggle mutations (over plain fetch, chosen for invalidation ergonomics).
- **`NEXT_PUBLIC_API_URL`** (fallback `http://localhost:8787`). Build-time inlined by static export.
- **Zod-validate responses with `ZLawyer`** at the fetch boundary, so the UI only handles validated `TLawyer` values and schema drift surfaces as an error, not a mid-render crash.
- **No tests** (UI-only sprint; per testing rule). Docs updated.

## API change

| Before | After |
|---|---|
| `ADMIN_TOKEN` bearer | `ADMIN_USERNAME` + `ADMIN_PASSWORD` HTTP Basic |

- `apps/api/src/index.ts` — `Env` type.
- `apps/api/src/routes/admin/index.ts` — guard: parse Basic, timing-safe compare both fields, `401 unauthorized` otherwise.
- `apps/api/wrangler.toml` — `[vars]` placeholders.
- CORS needs no change: `cors()` echoes `Access-Control-Request-Headers` on preflight, so `Authorization` passes.

## App structure (`apps/admin`)

```
src/
├── lib/
│   ├── auth.ts        # localStorage cred store (get/set/clear, base64)
│   └── api.ts         # typed fetch: base URL, Basic header, { error } envelope, 401 signal
├── features/lawyers/
│   ├── api.ts         # list(active?) + patch(id, partial), zod-validated
│   ├── hooks.ts       # useLawyers, useUpdateLawyer (optimistic, invalidate on error)
│   └── components/    # table, row, toggle, filters
└── app/
    ├── login/page.tsx # credential form
    ├── lawyers/page.tsx # list; no creds → /login, 401 → clear + /login
    └── page.tsx       # redirect → /lawyers
```

- `providers.tsx` (client) wraps children in `QueryClientProvider`; `layout.tsx` stays a server component.
- Tailwind: `postcss.config.mjs`, `globals.css` (`@import "tailwindcss";`), imported in `layout.tsx`.

## List UX

- Client-side search: name / `barNumber`.
- Filters: practice area, district (dropdowns from `@vidhan/schema` consts), active/all (server `?active=`).
- Columns: name, district, practiceAreas, languages, experience, barNumber, verified, active, updatedAt.
- Toggles call `PATCH /admin/lawyers/:id`; optimistic update, invalidate on failure.
- Errors: `409`/`400`/`500` → inline error; `401` → clear creds, back to `/login`.

## Accepted trade-off

Basic credentials sit in `localStorage` (base64, not encrypted). Fine for an admin-only hackathon tool — anyone with the browser profile already has full admin access. Conscious choice, not an oversight.

## Verification

`pnpm typecheck` · `pnpm lint` · `pnpm build`, then manual smoke against `dev:api` + seeded local D1.

## Out of scope

- Lawyer create/edit forms (Sprint 4?).
- Document repo admin.
- Web app directory screen.
