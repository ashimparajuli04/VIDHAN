# Vidhan — System Design (in progress)

Legal guidance chatbot for normal people. Three domains: chatbot RAG over legal repo, lawyer catalog escalation, document repo as data layer.
Three-person team, hackathon build. English UI; chat supports English, roman Nepali, Nepali (Devanagari). Content: Nepal government laws.

## Stack (settled)

| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| API | Hono — public routes + token-guarded `/admin/*` |
| Database | D1 (SQLite) — FTS5 for keyword search, metadata, catalog |
| Vectors | Vectorize — embeddings (D1 has no vector support) |
| AI | OpenRouter for chat + embeddings + summary generation; Vercel AI SDK for streaming/tool calls |
| Frontends | Next.js static export ×2: `apps/web` (chat), `apps/admin` (tables/forms) |
| Monorepo | pnpm workspaces + Turborepo, TS strict, zod as single source of truth |
| Admin auth | `ADMIN_USERNAME` / `ADMIN_PASSWORD` HTTP Basic, credential screen in admin app |

## Repo structure

```
vidhan/
├── apps/
│   ├── api/                # Hono Worker — all server-side code
│   │   ├── src/routes/
│   │   │   ├── public/     # POST /chat (SSE), GET /lawyers, GET /docs/:id
│   │   │   └── admin/      # /admin/lawyers CRUD · /admin/documents CRUD
│   │   │                   #   /admin/documents/:id/reindex · /admin/stats
│   │   ├── src/rag/         # chunker, hybrid search, RRF — plain modules
│   │   ├── src/ai/          # OpenRouter client, prompts, tool defs, model routing
│   │   └── src/ingest/      # pipeline: validate → summary → chunk → embed → index
│   ├── web/                # public chat UI (Next static export)
│   └── admin/              # admin UI (Next static export)
├── packages/
│   └── schema/             # zod — shared by web + api (SSE events, Lawyer, Citation)
├── data/                   # source corpus (bulk ingest input)
├── docs/                   # AGENTS.md, architecture notes, this file
└── pnpm-workspace + turbo.json
```

No separate `packages/rag` or `packages/ai` — single consumer (api app), lives as modules inside it. Only `schema` is a package (two consumers: web + api).

## Retrieval (RAG)

Two-stage, summary → section ("small-to-big"):

1. Query → embed (OpenRouter, multilingual model)
2. **Stage 1:** search document summaries (Vectorize `kind=summary` + FTS5) → candidate docs
3. **Stage 2:** hybrid search sections within candidates (Vectorize `kind=section` ⨯ FTS5) → RRF fusion (`score = Σ 1/(k + rank)`) → top chunks
4. LLM streams answer with mandatory `act/section` citations; ungrounded → refuse
5. Escalation tool call alongside: `{ serious, area, urgency, reason }` — zod-validated, invalid → rejected not rendered
6. Serious → D1 query lawyers by practice area (+ loose city match) → inline lawyer card via same SSE stream

Why hybrid: FTS5 handles exact terms (section numbers, act names, Devanagari); vectors handle meaning and cross-lingual matching (roman-Nepali ↔ Devanagari ↔ English).

Retrieval answers citations always carry `doc_id / section_no / page`.

## Ingest pipeline

One code path, two entries:

- `pipeline.ts`: validate (zod) → AI summary generation (cheap model) → section-aware chunking → batch embed → D1 + Vectorize write. Idempotent via content-hash ids.
- **Demo path:** `POST /admin/documents` runs the pipeline in-worker — upload an extracted doc in admin, bot uses it immediately, no setup.
- **Bulk path:** `pnpm --filter api ingest` reads `data/*` and POSTs to the same admin endpoint (thin file reader, no duplicate logic).

Summaries: AI-generated at ingest, stored in D1 + embedded — doubles as the stage-1 search index and the browse/directory view.

## Admin app

Not UI-focused; functional for admins only.

- Credential screen → localStorage → HTTP Basic header on all requests
- **Lawyer catalog:** list + create/edit/delete form
- **Repo:** document list with status (indexed, summary, chunk count), edit sections, edit/regenerate summary, upload new document, reindex
- Writes keep D1 and Vectorize in sync in the same operation

## Chat flow

SSE from Hono: history + message → query embed → two-stage retrieval → `streamText` with escalation tool → citations stream as structured events → UI renders citation cards; escalation result renders lawyer cards inline.

Model routing: cheap model for embedding/escalation/query-rewrite, capable model for grounded answer.

## Lawyer schema (settled)

```ts
// packages/schema/src/lawyer.ts
import { z } from "zod";

export const PRACTICE_AREAS = [
  "criminal", "civil", "family", "property", "consumer", "labor",
  "corporate", "immigration", "tax", "constitutional", "cyber",
  "banking", "human_rights", "other",
] as const;

export const LANGUAGES = ["en", "ne", "roman_ne"] as const;

export const lawyerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  practiceAreas: z.array(z.enum(PRACTICE_AREAS)).min(1),
  city: z.string().min(1),
  languages: z.array(z.enum(LANGUAGES)).min(1),
  barNumber: z.string().optional(),       // Nepal Bar Council registration
  yearsOfExperience: z.number().int().min(0).optional(),
  bio: z.string().max(500).optional(),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),      // soft-delete
  createdAt: z.string(),                  // ISO
  updatedAt: z.string(),
});

export type Lawyer = z.infer<typeof lawyerSchema>;

export const lawyerCreateSchema = lawyerSchema.omit({
  id: true, createdAt: true, updatedAt: true,
});
export const lawyerUpdateSchema = lawyerCreateSchema.partial();
```

Decisions:

- **No phone/email, no external link.** A lawyer is reached only through an on-platform callback request (`lawyer_requests`: the user's own phone + preferred time, status advanced by admin). No lawyer contact data reaches the public surface, and the request state lives in our DB.
- **`practiceAreas` enum** — escalation verdict emits the same enum → direct SQL join, no fuzzy matching. Adding an area later = one line in `PRACTICE_AREAS`; single source of truth feeds both admin form and escalation prompt.
- **`city` free text** — Nepal cities too varied to enumerate; match exact/`LIKE`, fall back to area-only if no city match.
- **`verified` + `barNumber`** — trust signal; unverified lawyers show a badge, not hidden.
- **`active`** — soft-delete so a lawyer never disappears mid-conversation.
- D1 table mirrors this 1:1; `practiceAreas`/`languages` as JSON text columns (SQLite); index on practice + city for escalation lookup.

## Reliability guardrails

- Ingest idempotent by content hash — re-runs never duplicate
- Every answer chunk carries citation; ungrounded claims → refusal
- Escalation verdict zod-validated at boundary
- Persistent disclaimer: Vidhan guides, lawyers advise

## Team split

| Owner | Scope |
|---|---|
| Repo | `data/` format, D1/Vectorize schemas, ingest pipeline, summaries |
| AI | `src/rag` + `src/ai`, retrieval quality, prompts, escalation logic |
| UI | chat streaming, citation rendering, lawyer cards, both Next apps |

## AI-first docs

`docs/AGENTS.md` at root + per-package READMEs so any teammate's agent can load context fast.

## Open items

- [ ] Document extraction schema (page-wise + section-wise JSON from our extraction) — must resolve to two retrieval units: **document (with summary)** and **section/page chunk (with content)**
- [ ] `data/` directory layout for source corpus
- [ ] D1 table DDL + Vectorize index config (after extraction schema)
- [ ] Chat/SSE event + escalation verdict schemas
