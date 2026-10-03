# Enterprise Plans & Access — Decisions

How the three Vidhan plans are represented and how Enterprise onboarding
works. Read alongside `docs/sprint-9-usage-limits.md` (individual plans) and
`docs/database.md` (schema workflow).

## Plans

| Plan | Allocation | Owner | Management |
|---|---|---|---|
| FREE | `USAGE_LIMITS.free` = **500K** tokens | Individual | None |
| SUBSCRIBED | `USAGE_LIMITS.subscribed` = **5M** tokens | Individual | Admin-only `isSubscribed` flag |
| ENTERPRISE | Custom, negotiated per organization | Organization | Org admin + Vidhan admin |

### Limits updated

`USAGE_LIMITS` moved from `100K / 1M` (sprint-9) to `500K / 5M` so the plan
cards on the Profile page and the enforced meters share one number. The cards
render `formatTokenCount(USAGE_LIMITS.*)` — there is no separate "marketing"
number that can drift.

### Subscribe CTA

There is **no payment/billing system** — `isSubscribed` is a boolean an admin
toggles in the admin Users page. The Subscribed card's "Subscribe" button is
therefore intentionally a **no-op** (styled button, no handler, no route).

### Enterprise is not a bigger subscription

It is an organization-level account: request → Vidhan review via the existing
Support thread → approval with negotiated limits → an organization with
approved seats and a per-member token allocation. No fixed token amount or
price is displayed for Enterprise, and it is never called "Unlimited".

## Data model (new entities)

- `enterprise_requests` — one per prospective org. Holds organization /
  contact / usage fields, `requested_capabilities` (JSON of
  `ENTERPRISE_CAPABILITIES`), the approval config written by the admin
  (`approved_seats`, `approved_tokens_per_member`, `approved_start_date`,
  `admin_notes`, `approved_at`), and `support_ticket_id` — the thread the
  whole life cycle is discussed in.
- `enterprise_organizations` — created by the approval action. Carries the
  negotiated `approved_seats` and `tokens_per_member`. The request's
  approval fields are copied here verbatim; the values are never hard-coded.
- `enterprise_members` — `(organization_id, email)` unique. `user_id` is
  null while an invite is outstanding; `tokens_allocated` is null when the
  org default (`tokens_per_member`) applies. The requester is seated as the
  `admin` member at approval time.

Reused unchanged: `users`, `support_tickets`, `support_ticket_messages`,
`user_usage`. No new messaging, billing, or notification system:
"notification" of approval is an admin message posted into the linked support
ticket (`author_role = "admin"`).

## Request lifecycle (admin-controlled)

`new → reviewing → awaiting_customer → negotiation → approved → active`, plus
`rejected` and `closed`. One live request per user: a resubmission is only a
new thread after the previous request reached a terminal state.

## Approval

`POST /admin/enterprise/requests/:id/approve` with `{ approvedSeats,
approvedTokensPerMember, approvedStartDate, notes? }`:

1. Marks the request `approved` and stores the config on it.
2. Creates `enterprise_organizations` (active).
3. Seats the requester as the org's `admin` member (active).
4. Posts the approval + allocation summary into the linked support thread.
5. The Enterprise sidebar tab appears after the next membership lookup —
   `GET /enterprise/membership` returns the org for any active member of an
   active organization.

## Members

- Adding a member: an existing Vidhan user's email seats them `active`
  immediately; an unknown email creates an `invited` row that activates when
  that email registers or logs in (hook in `POST /auth/register` and
  `/auth/login` — `activateInvites`).
- Seat limit: active + invited counts against `approved_seats`; adding past
  the limit returns `409 seat_limit_exceeded`.
- Only the org admin can add/remove/re-add members
  (`403 forbidden` otherwise); the admin cannot deactivate themselves;
  deactivating the last admin is refused so the org is never orphaned.
- The org admin cannot change allocations — `tokens_per_member` is set only
  by the Vidhan admin at approval; member rows carry `tokens_allocated`
  (null = org default) for future per-member adjustments.

## Usage

`getUsage` looks up the caller's active Enterprise seat and meters the day
against `tokens_per_member` when present, overriding both individual plans.
Free/subscribed limits apply only to non-enterprise members.

## API surface

Public (`requireAuth`): `POST /enterprise/requests`,
`GET /enterprise/requests/mine`, `GET /enterprise/membership`,
`GET /enterprise/organization`, `POST /enterprise/members`,
`PATCH /enterprise/members/:id`.

Admin (HTTP Basic): `GET/PATCH /admin/enterprise/requests[/:id]`,
`POST /admin/enterprise/requests/:id/approve`,
`GET /admin/enterprise/organizations[/:id]`.

Support threads created by an Enterprise request use
`source = "enterprise_request"` so the admin support queue can identify them
(`SOURCE_LABELS` in the admin app).

## Security rules enforced server-side

- Requests are private — `requests/mine` is scoped to the caller.
- Member mutations require an active admin seat in the target organization
  (cross-org access → `403`).
- Seat limits and self-deactivation are enforced in the data layer, not the
  UI.
- Approval endpoints sit behind the existing Basic-auth admin middleware.