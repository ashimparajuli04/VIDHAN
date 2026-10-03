# Lawyer details page (`/lawyers/[id]`)

Scope: the web app's lawyer profile page — the deeper, trust-focused counterpart to the
compact `LawyerCard`. Built on the shared merchant contract for a profile; no bookings,
availability, or ratings surface anything not in the schema.

## Decisions

1. **Detail projection in the shared schema** — `ZPublicLawyerDetail` / `TPublicLawyerDetail`
   (`packages/schema`) extends the public list shape with the decision-useful signals the
   list omits: `barNumber`, `firmName`, `courts`, `education`, `barEnrollmentYear`,
   `caseCounts`, and `memberSince` (the year derived from `createdAt` — the raw
   timestamp never leaves the API). The list (`TPublicLawyer`) carries only the card
   signals: `verified`, `seniority`, `totalCases` (the card's right-hand metric),
   `consultationModes` (plus the pre-existing languages). Internal fields (`imageKey`, timestamps, `active`) stay out.
   `GET /lawyers/:id` returns this projection via `toPublicLawyerDetail` (list endpoints are
   untouched and stay slim).

2. **No direct contact, by design** — `phone`, `whatsapp`, `email`, and `officeAddress` are
   deliberately **not** in the schema, and neither is a lawyer-supplied booking link. The
   only reach mechanism is the on-platform callback request: the profile CTA opens
   `RequestCallDialog`, which posts the user's own phone + preferred time to
   `/lawyer-requests`. The lawyer's own channel never reaches the public surface. Keep it
   this way unless the product explicitly wants contact surfaces.

3. **Static export constraint** — the web app is `output: "export"`, so `/lawyers/[id]`
   needs `generateStaticParams` at build time. `LAWYER_IDS` (deterministic `seed-001…150`)
   drives it; **when the API goes live, swap this source for real ids** or the route breaks
   at build. The page itself is a server shell (metadata + params) rendering a client
   component that fetches at runtime, mirroring the catalogue.
   Per-id `generateMetadata` was skipped: the seed rows are generated inside the API package
   (`apps/api/src/seed/lawyers.ts`), so no lawyer names/areas are available to the web build
   without duplicating the generator and risking drift. Static metadata
   ("Lawyer Profile · Vidhan") is used instead.

4. **Design shape** — mobile-first: compact back nav, left-aligned hero (avatar
   with hairline ring, name, designation line, location + experience),
   practice-area pills directly
   under the identity, then sections that
   each render only when they carry data: About → Courts (badges) → Case record
   (total cases fought + the per-tier breakdown) → Education & credentials (degree
   list, bar enrolment year, firm name) → Languages as a single quiet line. Consultation
   modes are deliberately not shown on the profile. The CTA
   plus facts (bar number, bar enrolled, member since) live in a bordered side card
   that is sticky from `lg`; on mobile the primary CTA is pinned to the bottom
   (`lg:hidden` bar with safe-area padding). Below the content, a "More [primary
   area] lawyers in [district]" row (up to 3) reuses `LawyerCard` on the catalogue
   list fetched client-side, excluding the current lawyer. Practice-area pills match
   `LawyerCard`: outlined, the primary area in the high-contrast `border-foreground`,
   the rest in the quiet grey `border-border`. The loading skeleton mirrors the
   loaded layout (including the sticky aside and the related row) so nothing shifts
   when data arrives.

5. **Card signals** — `LawyerCard` shows a compact identity (avatar, name, district
   line, and a small uppercase designation line — "Senior Advocate" /
   "Advocate"), practice-area pills (up to four, all shown), and a two-cell stats
   panel: years of experience on the left, **cases fought** on the right
   (`totalCases` from the list shape). Each cell renders only when it carries data;
   the panel hides entirely when neither metric exists. Below: a quiet languages
   line (truncated to two with "+N"), a two-line bio clamp, and a "View profile"
   footer link. No verified badge — verification is admin data, not a visual
   signal (see the badge removal decision).

6. **Mock only** — profile data mirrors `MOCK_LAWYERS`, which is typed
   `TPublicLawyerDetail[]` (still assignable to the list's `TPublicLawyer[]`). Mocks
   vary from fully-filled to sparse so the hide-when-empty paths stay exercised.

## Revert path

- Uncomment the API blocks in `getLawyers` / `getLawyer` (`apps/web/src/lib/lawyers.ts`).
- Delete `MOCK_LAWYERS` + `MOCK_LAWYER_IDS` and point `generateStaticParams` at a live id
  source (e.g. a generated `apps/web/src/lib/lawyer-ids.ts` from the API or a build-time fetch).