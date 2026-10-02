# Lawyer Catalogue Page — Implementation Plan

## Goal

Build a lawyer catalogue page (`/lawyers`) in the `web` app that renders cards for
each lawyer using the fields defined in `packages/schema/src/lawyer.ts`. The data is
mocked for now, but structured so that swapping in a real API later requires changing
**one function** (`getLawyers`), not the UI.

Scope (confirmed with user): **Grid + filters + loading states** — a responsive card
grid with a client-side search box and filters (practice area / city / language), plus
skeleton loading states with a simulated async delay to mimic a real API call.

---

## Context / Conventions

- Monorepo: Nx + pnpm. Apps: `web` (Next.js 15 App Router, React 19), `api`
  (Cloudflare Worker via wrangler), `admin`. Package: `schema` (`@vidhan/schema`).
- Web stack: Tailwind v4, shadcn/ui (new-york style, `data-slot` + CVA components in
  `src/components/ui`), `lucide-react` icons, `radix-ui` meta-package, `clsx` +
  `tailwind-merge` via `cn()` in `src/lib/utils.ts`.
- `@vidhan/schema` re-exports from `./lawyer`: `Lawyer` (type), `lawyerSchema`,
  `PRACTICE_AREAS`, `LANGUAGES`, `LawyerCreate`, `LawyerUpdate`.
- `app/lawyers/page.tsx` already exists as a placeholder; the sidebar already links to
  `/lawyers` (item "Lawyer Catalogue").
- Existing UI primitives: `button`, `dropdown-menu`, `input`, `separator`, `sheet`,
  `sidebar`, `skeleton`, `tooltip`. **Missing:** `card`, `badge`, `avatar` → to be added.
- Design tokens (`--card`, `--muted`, `--border`, etc.) are available in `globals.css`
  (neutral shadcn theme, light + dark).

### Lawyer schema (source of truth)

```ts
lawyerSchema = z.object({
  id: string,
  name: string,
  practiceAreas: enum(PRACTICE_AREAS)[],  // min 1
  city: string,
  languages: enum(LANGUAGES)[],          // min 1
  bookingUrl: string.url(),
  barNumber?: string,
  yearsOfExperience?: number.int >= 0,
  bio?: string.max(500),
  verified: boolean.default(false),
  active: boolean.default(true),
  createdAt: string,
  updatedAt: string,
})
```

`PRACTICE_AREAS = ["criminal","civil","family","property","consumer","labor",
"corporate","immigration","tax","constitutional","cyber","banking","human_rights",
"other"]`

`LANGUAGES = ["en","ne","roman_ne"]`

---

## Files

### New

1. **`apps/web/src/lib/lawyers.ts`** — API-ready data layer (the single swap point).
2. **`apps/web/src/components/ui/card.tsx`** — shadcn `Card` set.
3. **`apps/web/src/components/ui/badge.tsx`** — shadcn `Badge` variants.
4. **`apps/web/src/components/ui/avatar.tsx`** — initials avatar (no extra dep).
5. **`apps/web/src/components/lawyers/lawyer-card.tsx`** — presentational card.
6. **`apps/web/src/components/lawyers/lawyer-skeleton.tsx`** — skeleton card.
7. **`apps/web/src/components/lawyers/lawyer-catalogue.tsx`** — client component
   (fetching + filters + grid).

### Modified

8. **`apps/web/src/app/lawyers/page.tsx`** — replace placeholder with header +
   `<LawyerCatalogue />`.

---

## Detail

### 1. `apps/web/src/lib/lawyers.ts`

```ts
import type { Lawyer } from "@vidhan/schema";
import { LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";

// ── Display labels (schema stores enum keys, UI shows human text) ──
export const practiceAreaLabels = {
  criminal: "Criminal",
  civil: "Civil",
  family: "Family",
  property: "Property",
  consumer: "Consumer",
  labor: "Labor",
  corporate: "Corporate",
  immigration: "Immigration",
  tax: "Tax",
  constitutional: "Constitutional",
  cyber: "Cyber",
  banking: "Banking",
  human_rights: "Human Rights",
  other: "Other",
} as const;

export const languageLabels = {
  en: "English",
  ne: "नेपाली",
  roman_ne: "Roman Nepali",
} as const;

// ── Query shape mirrors the future /lawyers API params ──
export interface LawyerQuery {
  search?: string;        // matches name / bio
  practiceArea?: string;  // one of PRACTICE_AREAS
  city?: string;
  language?: string;      // one of LANGUAGES
}

// ── Mock data (typed as Lawyer → guaranteed shape-compatible) ──
const MOCK_LAWYERS: Lawyer[] = [ /* ~10 realistic entries, see §Data */ ];

const SIMULATED_LATENCY_MS = 600;

/**
 * Single integration point. Today it filters mock data with a simulated delay.
 * When the API exists, replace the body with e.g.:
 *
 *   const params = new URLSearchParams(query as Record<string,string>);
 *   const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/lawyers?${params}`);
 *   if (!res.ok) throw new Error("Failed to load lawyers");
 *   return lawyerSchema.array().parse(await res.json());
 */
export async function getLawyers(query: LawyerQuery = {}): Promise<Lawyer[]> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS)); // simulate network
  let results = MOCK_LAWYERS;
  const q = query.search?.trim().toLowerCase();
  if (q) results = results.filter(
    (l) => l.name.toLowerCase().includes(q) || l.bio?.toLowerCase().includes(q)
  );
  if (query.practiceArea)
    results = results.filter((l) => l.practiceAreas.includes(query.practiceArea as any));
  if (query.city)
    results = results.filter((l) => l.city === query.city);
  if (query.language)
    results = results.filter((l) => l.languages.includes(query.language as any));
  return results;
}

// City options derived from mock data for the filter <select>.
export const lawyerCities = [...new Set(MOCK_LAWYERS.map((l) => l.city))].sort();
```

### 2. `apps/web/src/components/ui/card.tsx`

Standard shadcn new-york card: `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
`CardContent`, `CardFooter`, `CardAction`. Use the existing design tokens
(`bg-card text-card-foreground border rounded-xl`). Keep the `data-slot` attributes and
`cn()` import to match the repo's other primitives.

### 3. `apps/web/src/components/ui/badge.tsx`

shadcn `Badge` with CVA variants: `default`, `secondary`, `outline`, `destructive`.
Practice areas → `secondary`; languages → `outline`; verified pill → `default` (or a
small custom green style). Match `data-slot="badge"` style.

### 4. `apps/web/src/components/ui/avatar.tsx`

Lightweight, dependency-free initials avatar (no `@radix-ui/react-avatar` needed):

```tsx
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  // deterministic background from name hash
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", className)} style={{ backgroundColor: colorFromName(name) }}>
      {initials}
    </div>
  );
}
```

### 5. `apps/web/src/components/lawyers/lawyer-card.tsx`

Server-safe (no hooks). Layout:

- **Header**: `Avatar` (initials) + `CardTitle` (name) + verified pill
  (`BadgeCheck` icon + "Verified" when `verified`) ; `CardDescription` = city
  (`MapPin`) · `${yearsOfExperience} yrs experience` (when present).
- **Content**: practice-area `Badge`s (`practiceAreaLabels`), language `Badge`s
  (`languageLabels`); bio with `line-clamp-2` (Tailwind v4 core); bar number in muted
  text ("Bar #…") when present.
- **Footer**: "Book consultation" `Button` (variant `default`, `ExternalLink` icon)
  rendered as `<a href={bookingUrl} target="_blank" rel="noopener noreferrer">`.
- Inactive lawyers (`active === false`) get a subtle "Inactive" treatment / muted style.

### 6. `apps/web/src/components/lawyers/lawyer-skeleton.tsx`

Mirrors `LawyerCard` structure using `Skeleton` from `ui/skeleton`: avatar circle,
two title lines, badge row, and a button placeholder.

### 7. `apps/web/src/components/lawyers/lawyer-catalogue.tsx`

`"use client"`. Owns all fetching + filter state.

```tsx
"use client";
import { useEffect, useState } from "react";
import { getLawyers, type LawyerQuery } from "@/lib/lawyers";
// ... imports

export function LawyerCatalogue() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<LawyerQuery>({});

  // debounce search; refetch on any query change
  useEffect(() => {
    let active = true;
    setLoading(true);
    getLawyers(query).then((data) => {
      if (active) { setLawyers(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [query]);

  return (
    <div>
      {/* Filter bar: search Input + selects (practiceArea/city/language) + Clear */}
      {/* If loading → skeleton grid; else if empty → empty state; else → card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">…</div>
    </div>
  );
}
```

- Filter bar uses existing `Input` for search and native styled `<select>` for the
  three filters (avoid adding a shadcn `select` dependency). Practice-area options from
  `PRACTICE_AREAS` + labels; city from `lawyerCities`; language from `LANGUAGES` + labels.
- Search input debounced (~250ms) before updating `query.search`.
- Loading: render 6 `LawyerSkeleton` cards.
- Empty: centered message "No lawyers match your filters." with a Clear action.
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`.

### 8. `apps/web/src/app/lawyers/page.tsx`

```tsx
import { LawyerCatalogue } from "@/components/lawyers/lawyer-catalogue";

export default function LawyersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lawyer Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Browse verified legal professionals across Nepal.
        </p>
      </header>
      <LawyerCatalogue />
    </main>
  );
}
```

---

## Mock data (`MOCK_LAWYERS`)

~10 entries, varied to exercise every field and filter:

- Nepali names (e.g., "Aarav Sharma", "Sita Thapa", "Bikash Rai", "Anjali Gurung",
  "Rohit Poudel", "Maya Tamang", "Deepak Karki", "Nisha Shrestha", "Sujan Basnet",
  "Kavita Maharjan").
- `city`: Kathmandu, Lalitpur, Pokhara, Biratnagar, Bharatpur, Butwal.
- `languages`: mix of `en`, `ne`, `roman_ne`.
- `practiceAreas`: spread across the enum (some with 2–3 areas).
- `barNumber`: e.g., `"KTM-2014-0821"`.
- `yearsOfExperience`: 3–25.
- `bio`: 1–2 sentences, < 500 chars.
- `verified`: mix of true/false; `active`: mostly true, one false to show inactive state.
- `bookingUrl`: real-looking `https://cal.com/…` or `https://…` URLs.
- `createdAt` / `updatedAt`: ISO 8601 strings.

---

## API integration checklist (future)

- [ ] Set `NEXT_PUBLIC_API_BASE` env var.
- [ ] Replace `getLawyers` body with `fetch(`${API_BASE}/lawyers?${params}`)`
      + `lawyerSchema.array().parse(...)`.
- [ ] Remove `MOCK_LAWYERS` and `SIMULATED_LATENCY_MS`.
- [ ] No UI changes required — `LawyerQuery`, `LawyerCard`, and `LawyerCatalogue`
      already match the endpoint's contract.

---

## Verification

- `pnpm --filter @vidhan/web typecheck` passes (mock data typed as `Lawyer`).
- `pnpm dev:web` → open `/lawyers`: cards render, filters narrow results, skeletons show
  on load/filter change, empty state appears for no matches, dark mode looks correct.
- Booking button opens `bookingUrl` in a new tab.
