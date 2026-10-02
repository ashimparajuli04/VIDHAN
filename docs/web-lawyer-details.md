# Lawyer details page (`/lawyers/[id]`)

Scope: the web app's lawyer profile page — the deeper, trust-focused counterpart to the
compact `LawyerCard`. Built on the shared merchant contract for a profile; no bookings,
fees, availability, or ratings surface anything not in the schema.

## Decisions

1. **Detail projection in the shared schema** — `ZPublicLawyerDetail` / `TPublicLawyerDetail`
   (`packages/schema`) extends the public list shape with exactly two trust signals:
   `verified` and `barNumber`. Internal fields (`imageKey`, timestamps, `active`) stay out.
   `GET /lawyers/:id` returns this projection via `toPublicLawyerDetail` (list endpoints are
   untouched and stay slim).

2. **Static export constraint** — the web app is `output: "export"`, so `/lawyers/[id]`
   needs `generateStaticParams` at build time. While `MOCK_LAWYERS` is in place, the mock
   ids drive it (`MOCK_LAWYER_IDS` in `apps/web/src/lib/lawyers.ts`). **When the API goes
   live, swap this source for real ids** or the route breaks at build. The page itself is a
   server shell (metadata + params) rendering a client component that fetches at runtime,
   mirroring the catalogue.

3. **Design shape** — mobile-first: compact back nav, centered hero (large `PigAvatar` as
   the identity anchor with a hairline ring, name, quiet emerald "Verified by Vidhan" pill,
   location + experience), quiet sections (About → Practice areas → Languages → Professional
   information), and the primary CTA pinned to the bottom (`lg:hidden` sticky bar with safe-
   area padding). From `lg`: two columns, CTA + facts in a sticky side panel. No booking URL
   renders a disabled "Booking link coming soon" outline button instead of a dead CTA.

4. **Mock only** — profile data mirrors `MOCK_LAWYERS`, which is now typed
   `TPublicLawyerDetail[]` (still assignable to the list's `TPublicLawyer[]`). Three mock
   lawyers are unverified and lack bar numbers to exercise the missing-state paths.

## Revert path

- Uncomment the API blocks in `getLawyers` / `getLawyer` (`apps/web/src/lib/lawyers.ts`).
- Delete `MOCK_LAWYERS` + `MOCK_LAWYER_IDS` and point `generateStaticParams` at a live id
  source (e.g. a generated `apps/web/src/lib/lawyer-ids.ts` from the API or a build-time fetch).