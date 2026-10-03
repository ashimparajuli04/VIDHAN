# Sprint 8 — Support Tickets

Scope: let users raise issues to admins, and let admins reply. Two entry points:

1. A **Support** item in the user sidebar where a user files a ticket manually and
   tracks the admin reply.
2. A **chat UI action**: when the assistant cannot find a provision, or
   `find_lawyers` returns none, it offers to file a ticket from the user's query.

Not a live chat — a ticket system. No websockets, no polling, no unread badges.

## Definition of done

- A user can create a ticket from `/support` (subject + message) and from the chat
  offer card.
- A user sees their tickets, opens one, reads the thread, and replies.
- An admin sees all tickets, opens one, replies, and closes/reopens it.
- Replying to a `closed` ticket reopens it.
- The chat offer card creates the ticket only on click, then shows its link.
- `pnpm typecheck` and `pnpm lint` pass.

## Decisions

### Ticket model

- **Threaded**, not one-shot: `support_tickets` + `support_ticket_messages`
  (`authorRole: user | admin`). A single reply column would force a schema change
  the first time a user follows up.
- **Status is `open | closed`.** Admin closes; a user message on a closed ticket
  flips it back to `open`. No `resolved` state — nobody acts on it.
- **Tickets are standalone.** No `chatSessionId` / `chatMessageId` back-link to the
  conversation. The chat-created ticket's body is the user's query; the ticket does
  not otherwise know where it came from.
- `category: missing_document | missing_lawyer | other`, `source: support_page | chat`.
- IDs follow the repo convention (`crypto.randomUUID()`); a ticket link is
  `/support/{id}`, no separate slug.

### Chat offer — consent-gated

- The model calls a server tool `offer_support_ticket` with
  `{ category, reason }`. `execute` is a **no-op** returning `{ offered, category }`.
- **Nothing is created until the user clicks.** The client renders an offer card
  from the persisted tool part; the button calls `POST /support/tickets` with
  `{ message: <last user text>, category, source: "chat" }`.
- Auto-create was rejected: a hallucinated "I couldn't find it" would silently file
  tickets and spam the admin queue.
- Triggers: (a) no relevant provision found, (b) `find_lawyers` returned none.
  A "recurring issue" trigger was dropped — not detectable from a single turn; it
  maps to `other` and only appears if the user says so.
- One tool with a `category` param, not three tools.
- Added to `REFINEMENT_TOOLS` so a late retrieval failure can still offer.

### Duplicate handling

- **Server-side dedupe:** `POST /support/tickets` returns the existing ticket when
  the same user already has an `open` ticket with identical `category` + body.
- The offer button also disables client-side after a successful click.
- Because tickets are standalone, a reloaded chat re-renders the offer card with
  its button; dedupe is what stops a second click from creating a duplicate.

### Notifications

- **None.** No unread badge, no polling. The user checks `/support`; the admin
  refreshes the queue. Matches "not a live chat."

### UI

- User: sidebar `Support` item (lucide `LifeBuoy`) → `/support` (list + New ticket)
  → `/support/[id]` (thread + reply). List→detail.
- Admin: minimal top nav (`Lawyers | Support`) in `layout.tsx`; `/support` is
  list→detail with a reply box and a Close/Reopen button. No assignment, no bulk
  actions.
- Chat: `SupportOfferCard` rendered in `message-bubble.tsx`, fed by an
  `offer_support_ticket` extraction in `adapt.ts`.

### API surface

User (JWT, `requireAuth`):

- `POST /support/tickets` — `{ subject?, message, category, source }`; derives
  `subject` from `message` when omitted; dedupes.
- `GET /support/tickets` — own tickets.
- `GET /support/tickets/:id` — own ticket + thread.
- `POST /support/tickets/:id/messages` — own reply; reopens if closed.

Admin (Basic auth):

- `GET /admin/support/tickets` — all, optional `?status=open|closed`.
- `GET /admin/support/tickets/:id` — thread + user name/email.
- `POST /admin/support/tickets/:id/messages` — admin reply.
- `PATCH /admin/support/tickets/:id` — `{ status }` to close/reopen.

## Module layout

```
packages/schema/src/db/schema.ts     # support_tickets, support_ticket_messages, Z/T exports
packages/schema/drizzle/             # generated migration

apps/api/src/
├── support/index.ts                 # create (dedupe), list, find, addMessage, setStatus
├── routes/public/support.ts         # JWT user endpoints
├── routes/admin/support.ts          # Basic-auth admin endpoints
├── routes/public/index.ts           # mount /support
├── routes/admin/index.ts            # mount /support
├── ai/tools.ts                      # offer_support_ticket (no-op execute) + REFINEMENT_TOOLS
└── ai/prompts.ts                    # one line: offer when no provision / no lawyers

apps/web/src/
├── components/app-sidebar.tsx       # + Support item
├── app/(app)/support/page.tsx       # list + New ticket
├── app/(app)/support/[id]/page.tsx  # thread + reply
├── features/support/                # api, types, hooks, components
└── features/chat/
    ├── adapt.ts                     # extract offer_support_ticket → TChatMessageView.supportOffer
    ├── types.ts                     # + TSupportOffer
    ├── components/message-bubble.tsx
    └── components/support-offer-card.tsx

apps/admin/src/
├── app/layout.tsx                   # minimal top nav
├── app/support/page.tsx             # list → detail, reply, close/reopen
└── features/support/                # api, hooks, components
```

## Verification

```pwsh
pnpm typecheck
pnpm lint
```

Manual smoke: create a ticket from `/support` → appears in admin → reply → user sees
it → close → user replies → reopens. Then in chat ask about an absent topic, click
the offer card, follow the link, and confirm dedupe on a second click.

## Out of scope

- Notifications, unread counts, websockets, polling.
- Ticket assignment, priority, SLA, bulk actions, search/filters beyond status.
- Attachments.
- Chat-session back-link on tickets.
- Email delivery.
