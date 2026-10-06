# iPhone PWA (home-screen app)

## Decisions

- No service worker. iOS standalone does not require one, and caching a
  frequently rebuilt static export served from an ephemeral quick-tunnel
  origin would strand visitors on stale bundles. Revisit only if offline
  support becomes a requirement.
- Set both install paths, because iOS snapshots metadata at add time:
  `display: "standalone"` in `app/manifest.ts` (iOS 16.4+) and Next's
  `appleWebApp.capable` meta for older versions.
- `app/apple-icon.png` (180×180) is rasterized from `app/icon.svg` onto solid
  `#61211D` because iOS renders icon transparency as black.
- `public/icons/*` come from the same SVG; the maskable variant keeps the
  logo inside the ~68% safe zone.
- `theme_color` = `#61211D` (brand), `background_color` = `#FAF7F3` (light
  background from `globals.css`).

## Regenerating icons

```bash
rsvg-convert -w 1024 -b '#61211D' apps/web/src/app/icon.svg -o /tmp/icon-1024.png
magick /tmp/icon-1024.png -background '#61211D' -gravity center -extent 1024x1024 /tmp/icon-square.png
magick /tmp/icon-square.png -resize 180x180 apps/web/src/app/apple-icon.png
magick /tmp/icon-square.png -resize 192x192 apps/web/public/icons/icon-192.png
magick /tmp/icon-square.png -resize 512x512 apps/web/public/icons/icon-512.png
magick /tmp/icon-square.png -resize 340x340 -background '#61211D' -gravity center -extent 512x512 apps/web/public/icons/maskable-512.png
```

## Gotchas

- iOS snapshots the manifest/meta **when the icon is added**. After changing
  PWA metadata, the existing home-screen icon must be deleted and re-added;
  an old icon keeps launching in Safari with its chrome.
- Standalone mode has separate storage from Safari: first launch is logged
  out, and the theme follows the system.
- Rebuilds into `apps/web/out` are picked up live by `npx serve` (see
  `remote-sharing.md`), so PWA updates keep the same share URL — just rebuild
  with the same baked `NEXT_PUBLIC_API_URL`.
- Installing from a quick tunnel ties the PWA to that random origin; when the
  tunnel is restarted the install points at a dead host until re-added. A
  stable origin (named tunnel / deploy) makes home-screen installs durable.
