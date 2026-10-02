# Sprint 2 — Lawyers API

Scope: the lawyers catalog API. Chatbot tool-calling and the booking flow are **out of scope** (later sprints) — this sprint only makes the catalog queryable and admin-curatable.

## Problem domain

Vidhan is a bridge to professional legal guidance, not a replacement. The chatbot is the first step; when it detects (or the user asks) it surfaces lawyer cards. The catalog is the supply side.

- **Atomic unit = individual lawyer.** Firms/chambers are a later `firms` table + relation; no rework needed if lawyer fields stay clean. No lawyer onboarding or lawyer dashboard, ever — the admin is the human monitor of the list.
- **Two consumers of the same catalog:** the user-facing directory screen (structured filters) and the chatbot (later, via tool calling). Admin CRUD is separate.
- **`verified` = credentials confirmed offline.** Public surfaces show only `active AND verified` lawyers. `active` is soft-delete/temporary-hide; `verified` is the publish gate. Admin sees all rows.
- Mock 50–100 lawyers so every practice area is covered; empty-result handling still designed in.

## Matching model

| Axis | Role |
|---|---|
| `practiceArea` | **Only hard filter.** |
| `district` | **Exact filter** when provided. |
| `language` | **Soft** — reorders (matching first), never excludes. |
| `yearsOfExperience`, `verified` | Ranking only. |

Empty-district recovery: user sets location at onboarding → query district → if empty, API returns per-district counts for the same practice area → client asks "no lawyers in your district; 4 in Lalitpur, 2 in Bhaktapur — search there?" → user opts in via a **second, explicit call**. No silent relaxation.

## Schema (`@vidhan/schema`)

- Rename `city` → `district`; validate against a `DISTRICTS` const (same pattern as `PRACTICE_AREAS`/`LANGUAGES`), shared with web/admin for dropdowns. Stored as text, so growing the const needs no migration.
- `bookingUrl` becomes **nullable** — contact/booking mechanism is deferred; the field may be absent.
- Unique index on `barNumber` (nullable — unique only when present).
- Rename to `AGENTS.md` convention: `ZLawyer`, `ZLawyerCreate`, `ZLawyerUpdate`, `TLawyer`, `TLawyerCreate`, `TLawyerUpdate`. Keep Drizzle `$inferSelect` names as `LawyerRow` / `LawyerInsert`.
- New migration for: `city`→`district`, nullable `bookingUrl`, unique `barNumber`.

## API contract

**Public**

- `GET /lawyers` — params `practiceArea`, `district`, `language` (all comma-separated/multi-value), `limit` (default 20, max 50), `offset`. No free-text `q`.
  - Hard gate: `active AND verified`. Then exact `practiceArea` + exact `district` filters.
  - Rank: `yearsOfExperience desc → name asc`. `language` matching floats up.
  - Response `{ lawyers, meta: { total, districtCounts? } }`; `districtCounts` scoped to the queried practice area and returned **only when the result is empty**.
  - Pagination is in-memory (fetch the practice-area slice, sort, slice).
- `GET /lawyers/:id` — 404 unless `active AND verified` (do not leak existence).

**Admin** (token-guarded, `/admin/*`)

- `GET /admin/lawyers` — returns **all** rows by default; optional `?active=true|false`.
- `GET /admin/lawyers/:id` — any row regardless of flags.
- `POST /admin/lawyers` — defaults `verified:false, active:true`; server-set `id`, `createdAt`, `updatedAt`.
- `PATCH /admin/lawyers/:id` — partial update (renamed from `PUT`, which was already partial). `verified` toggles here; no dedicated verify endpoint. Reactivation = `PATCH active:true`.
- `DELETE /admin/lawyers/:id` — soft-delete (`active:false`).
- Duplicate `barNumber` → `409 { error: "duplicate_bar_number" }` (catch the D1 unique violation, don't 500).

Error envelope stays `{ error, details? }`: `400 validation_error`, `401 unauthorized`, `404 not_found`, `409 duplicate_bar_number`, `500 internal_error`.

## Separation

Lawyer lookup lives in one reusable module. Admin CRUD never touches it. The chatbot tool (later) calls the same search function with a curated projection that omits internal fields (`barNumber`, raw flags, timestamps) — enforced in code, not by a URL. No chat route is built this sprint.

## Hardening

Rate limiting deferred (infra config, irrelevant at demo scale).

**Open:** timing-safe admin-token compare — deferred or do now? (One-line, in-code.) The `409` is part of the contract regardless.

## Out of scope

- Booking/contact mechanism (`bookingUrl` nullable placeholder only).
- Chatbot tool calling + curated projection.
- Firms / lawyer–firm relation.
- User onboarding + location storage (web-side; the API only needs to accept `district`).
