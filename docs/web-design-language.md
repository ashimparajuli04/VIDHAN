# Web design language — warm, soft, confident

Adopted the Cleo-inspired "warm, soft, confident" language for the web app
(`apps/web`). Friendly fintech feel: one deep brown instead of black, warm
off-white instead of pure white, very round shapes, huge bold headings,
almost no shadows. Hierarchy comes from size, weight, and tonal surfaces.
This file records the decisions and the token mapping so future changes
stay consistent (docs/ rule: non-obvious decisions live here).

## 1. Palette → shadcn variables (light)

All values are stored in `globals.css` as HSL. The hex column is the
reference value from the design spec.

| Role | Reference hex | Variable | HSL |
|---|---|---|---|
| Page background | `#F9F7F4` | `--background` | `hsl(36 29% 97%)` |
| Primary / text / filled buttons | `#4A1F1C` | `--primary` / `--foreground` | `hsl(4 45% 20%)` |
| Tonal card surface | `#F0EDEA` | `--card`, `--muted` | `hsl(30 17% 93%)` |
| Card hairline border | `#E2DDD8` | `--border`, `--input` | `hsl(30 15% 87%)` |
| Icon-button circle | `#E8E4E1` | `--secondary` | `hsl(26 13% 90%)` |
| Muted text | `#8C7B77` | `--muted-foreground` | `hsl(11 8% 51%)` |
| Accent (attention tags) | `#F7DC7A` | `--accent` | `hsl(47 89% 72%)` |
| Accent text | `#4A1F1C` | `--accent-foreground` | `hsl(4 45% 20%)` |
| Inactive pill / chip | white @ ~70% | `--chip` (custom) | `hsl(0 0% 100% / 0.72)` |
| Peach gradient (hero/empty) | `#FDF6F0` → `#FFD9C0` | `--peach-top` / `--peach-bottom` (custom) | `hsl(28 76% 97%)` / `hsl(24 100% 88%)` |
| Radius | 28px | `--radius` | `1.75rem` |

`--chip` and `--peach-*` are custom tokens exposed as `bg-chip`,
`from-peach-top`, `to-peach-bottom` via `@theme inline`.

## 2. Dark theme

Warm dark, no pure black: background `#191210` (`hsl(13 22% 8%)`), card
`#221917`, off-white text, peach-tinted primary `#F5C9B0`
(`hsl(22 78% 83%)`), border `#332420`. The peach gradient darkens to two
deep brown stops instead of staying bright.

## 3. Decisions

- **`--radius` = `1.75rem` (28px)** and the radius scale is remapped from
  it (`--radius-md` = 22px, `--radius-lg` = 28px, …), so every shadcn
  component inherits the rounded language. Cards use
  `rounded-[var(--radius)]`; buttons, badges, chips, tabs are `rounded-full`.
- **No shadows.** Cards are flat (tone-on-tone + hairline border). Shadow
  removed from `Card`, auth cards, select trigger. Only a `shadow-sm`
  remains on the floating chat "jump to latest" FAB and the mobile sidebar
  trigger, where lift is functionally needed.
- **Button roles were redefined** per the spec: `default` = filled brown
  pill; `outline` = transparent with a 1.5px brown outline (the old
  neutral-outline look is gone); `secondary` = tonal circle; press state
  scales to 0.98 with a 150ms ease-out transition.
- **Verified = yellow accent pill**, never green. The emerald checks on
  lawyer cards/profile and the chat search result were replaced with
  `Badge variant="accent"` (new variant) or brown `text-primary` checks.
- **Hero numbers** (large value + small baseline unit, e.g. `1,500` + `NPR`)
  used for consultation fees and years of experience on the lawyer card and
  profile.
- **Peach gradient only on warm/conversational/empty states**: chat empty
  state, auth backdrop (top fade), catalogue "no results" box. Data screens
  (catalogue, profile, repo) stay on the flat page background.
- **Featured moment**: the profile aside (booking CTA + bar facts) is the
  one full-bleed dark brown card per screen, with an inverted outline
  button.
- **Font**: no font packages are installed and `output: "export"` means
  `next/font/google` would need network at build time, so the font stack is
  a system-geometric-grotesque stack (`Inter Tight → Plus Jakarta Sans →
  Figtree → system-ui`). Swap in a bundled `@fontsource`-style font when
  one is available; no code changes needed beyond globals.
- **Copy**: core screens (profile, booking, catalogue) keep professional,
  first-person copy; chat empty state is the one place with the emoji
  heading ("Hey you 👋") and lowercase quick-reply chips.

## 4. Surface restyled

- `globals.css` — full token rewrite + custom tokens (lights + `:root`/`.dark`).
- Primitives: `button`, `badge` (added `accent` variant), `card`, `input`,
  `select` (pill trigger), `sheet` (warm brown overlay instead of `bg-black/50`).
- Screens: lawyers list (screen-title header, pill filters, tonal
  catalogue card with stats panel, peach empty state), lawyer profile
  (hero, yellow Verified pill, fee hero number, dark aside card), chat
  (peach empty state, pill composer with in-pill send circle, warm
  bubbles), auth (gradient backdrop, rounded cards), repo list, terms,
  privacy, sidebar labels (sentence case: "Vidhan", "Recent").