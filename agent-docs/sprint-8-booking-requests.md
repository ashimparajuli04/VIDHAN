# Sprint 8 — Booking Requests (contact goes through us)

Scope: replace the public `bookingUrl` escape hatch with an on-platform callback
request. A user asks Vidhan to arrange a consultation; the request is stored and
visible to the user (with status) and to admins, who advance it. **No lawyer
contact data reaches the public surface.**

## Why

`bookingUrl` was the only reach mechanism, exposed on `ZPublicLawyer` /
`ZPublicLawyerDetail` and rendered as a direct external link (Calendly/Cal.com).
That is the opposite of "the user contacts the lawyer through us": it leaks the
lawyer's own channel and bypasses the platform. Two rejected alternatives:

- **Masked redirect** — our endpoint 302s to the lawyer's booking URL. Cosmetic
  mediation only; the user still lands on the lawyer's own page.
- **Internal scheduling** — we own slots/availability. Real mediation, but far
  beyond a one-hour slice.

Chosen: **on-platform callback request (lead capture)**. User submits their own
contact + preferred time; we store it; admin follows up.

## Decisions

1. **Remove `bookingUrl` entirely** — column, refinements, public projections,
   admin form/route, seed generator, and every UI reference. Not just hidden
   from public surfaces; the field is deleted so a direct channel can't re-leak.

2. **Auth required to submit.** The request is tied to a `userId`; we already
   know the requester's name + email. The form collects only what `users`
   lacks (a callback `phone`). Anonymous submissions are rejected.

3. **New `lawyer_requests` table.** `id`, `lawyerId` → lawyers, `userId` → users,
   `phone` (notNull), `preferredTime` (free text, notNull), `mode` (nullable,
   reuses `CONSULTATION_MODES`), `note` (nullable), `status`
   (`LAWYER_REQUEST_STATUSES = pending | contacted | closed`, default `pending`),
   `createdAt` / `updatedAt`. Indexes on `(userId, createdAt)` and `lawyerId`.

   - `preferredTime` is free text ("Tomorrow evening", "This weekend") — faster
     than a datetime picker and matches how people actually ask for a callback.
   - `status` is present from the start because the user-facing list needs
     something to reflect as admin works the queue.

4. **Visible on both sides.** End users get a `/requests` page (lawyer,
   preferred time, mode, status). Admins get a requests list and can advance
   `pending → contacted → closed`.

5. **No notifications this sprint.** No email/WhatsApp infra; storage + the two
   list surfaces are the follow-up mechanism. A request landing in D1 with no
   read path would make "go through us" hollow, which is why both lists are in
   scope.

## Scope

### Schema — `packages/schema/src/db/schema.ts`
- Delete `bookingUrl` from `lawyers`, from `lawyerRefinements`, and from
  `ZPublicLawyer`.
- Add `LAWYER_REQUEST_STATUSES` + `TRequestStatus`, the `lawyerRequests` table,
  and the Zod contracts: `ZLawyerRequestCreate`, `ZLawyerRequestStatusUpdate`,
  `ZPublicLawyerRequest` (own view, adds `lawyerName`),
  `ZAdminLawyerRequest` (adds `userName`, `userEmail`, `phone`, `updatedAt`).
- Export types from `packages/schema/src/index.ts`; regenerate the migration and
  apply it locally.

### Seed
- `apps/api/src/seed/lawyers.ts`: drop `bookingUrl` from `buildRow` and from the
  insert column list; regenerate `data/lawyers.seed.sql` and reload.

### API
- `apps/api/src/lawyer-requests/index.ts` — create, list-own (join lawyer name),
  list-all (join lawyer + user), update-status, with public projections.
- `apps/api/src/routes/public/lawyer-requests.ts` — `POST /` + `GET /`, both
  `requireAuth()`; mounted at `/lawyer-requests`.
- `apps/api/src/routes/admin/lawyer-requests.ts` — `GET /`, `PATCH /:id`;
  mounted in `routes/admin/index.ts`.
- `apps/api/src/lawyers/index.ts` — drop `bookingUrl` from `toPublicLawyer`.
- `apps/api/src/routes/admin/lawyers.ts` — drop `bookingUrl` from the create row.

### Web
- `features/lawyers/requests-api.ts` — `createLawyerRequest` /
  `getMyLawyerRequests`, Bearer via `readToken()` (mirrors `features/chat/api.ts`).
- `components/ui/dialog.tsx` + `features/lawyers/components/request-call-dialog.tsx`
  — phone + preferred time required, mode + note optional, success state.
- `components/lawyers/lawyer-profile.tsx` — replace `BookButton` (desktop aside +
  mobile pinned bar) with a dialog trigger; remove the `bookingUrl` prop and the
  "Booking link coming soon" branch.
- `features/chat/components/lawyer-result-card.tsx` — add "Request a call" for
  parity with the profile.
- `app/(app)/requests/page.tsx` + nav item in `components/app-sidebar.tsx`.
- Delete dead duplicate `features/lawyers/components/LawyerCard.tsx` (its only
  remaining `bookingUrl` consumer).

### Admin
- `features/lawyer-requests/` hooks + table (lawyer, user, phone, time, mode,
  note, status); `app/lawyer-requests/page.tsx`; link from the lawyers header.

### Docs
- Update `database.md`, `web-lawyer-details.md`, `system-design.md`.

## Cut list if the hour runs short

1. Admin status control → ship a read-only list (`status` stays `pending`).
2. Chat-card CTA → profile-only.
3. `/requests` page → keep the profile's inline "you requested a call" state.

## Verification

```pwsh
pnpm --filter @vidhan/schema db:generate
pnpm --filter @vidhan/api exec wrangler d1 migrations apply DB --local
pnpm --filter @vidhan/api db:seed
pnpm --filter @vidhan/api db:seed:load
pnpm --filter @vidhan/web typecheck
pnpm --filter @vidhan/admin typecheck
pnpm --filter @vidhan/web build
pnpm --filter @vidhan/admin build
```

Manual smoke: login → open a lawyer profile → Request a call → submit → success
state → `/requests` shows it as pending → admin list shows it → advance to
`contacted` → user list reflects the new status. Confirm no `bookingUrl` remains
in any public payload or UI.

## Out of scope / follow-ups

- Notifications (email/WhatsApp) to lawyer or admin.
- Availability, slots, or actual scheduling.
- Duplicate-pending-request guard per (user, lawyer).
- Cancelling a request from the user side.
