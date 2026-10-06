# Sharing the app with a friend outside your network

## Decisions

- Share the **static export build** (`apps/web/out`), not `next dev`. It is
  faster for the visitor, has no dev-only overlay, and matches what a real
  deploy serves. `NEXT_PUBLIC_API_URL` is inlined at build time, so the build
  must happen after the API tunnel URL is known.
- The API gets its **own quick tunnel**. One tunnel cannot work: quick tunnels
  expose exactly one port, and when no explicit URL is set the frontend derives
  `https://<hostname>:8787` from the page origin, which the web tunnel does not
  serve. The API tunnel URL is baked into the build instead.
- `scripts/share.sh` orchestrates API tunnel → build → serve `out` → web
  tunnel → print the share link. It does **not** start the API dev server; run
  `pnpm dev:api` first (per `AGENTS.md`, the user starts dev servers).
- The build uses `pnpm --filter @vidhan/web build`, not root `pnpm build`. Nx
  caches the web build and does not key its cache on `NEXT_PUBLIC_API_URL`, so
  a cached artifact can silently ship with a stale API origin.
- The static server is `npx serve -s apps/web/out` (`--single`), so hard
  refreshes on client-routed paths return `index.html`.
- The API stays on `wrangler dev`: it already runs the workerd runtime
  locally, there is no "built but local" variant. A production API means
  `wrangler deploy` (see README → Deployment).

## Running

```bash
pnpm dev:api   # terminal 1
pnpm share     # terminal 2 -> prints the public URL
```

## Keeping it alive (systemd user units)

Sharing long enough for a friend to use means the stack must survive terminal
closes and crashes. Three user units live in `~/.config/systemd/user/`:

| Unit | Runs | Behaviour |
|---|---|---|
| `vidhan-api.service` | `pnpm --filter @vidhan/api dev` | `Restart=always`, owns :8787; a restart does **not** change the share URL |
| `vidhan-keepawake.service` | `systemd-inhibit … sleep infinity` | blocks idle/sleep/lid suspend while active |
| `vidhan-share.service` | `scripts/share.sh` | enabled for boot only; **every start mints new quick-tunnel URLs** |

`loginctl enable-linger ashim` is on, so these run without a login session.

```bash
systemctl --user status vidhan-api vidhan-share vidhan-keepawake
journalctl --user -u vidhan-share -f
systemctl --user start vidhan-share      # new web + API URLs (re-share them)
systemctl --user stop vidhan-share       # retire the current URLs
systemctl --user stop vidhan-keepawake   # allow sleeping again
```

Gotchas:

- A share stack started manually (`pnpm share`, or detached with `setsid`) is
  not supervised. To move onto supervision: stop the manual one, then
  `systemctl --user start vidhan-share` — the URL changes.
- `vidhan-keepawake` also blocks lid-close suspend; stop it before putting a
  laptop in a bag.
- After a reboot the share unit comes up with fresh URLs automatically;
  anyone holding an old link must be re-sent the new one.

## Gotchas

- Cloudflare can delete a quick tunnel server-side while the local process
  stays alive, retrying forever: the cloudflared log shows
  `Unauthorized: Tunnel not found` and the URL returns 530. No local fix —
  `systemctl --user restart vidhan-share` mints new URLs.

- Quick tunnel URLs are random and die with the process. Restarting the API
  tunnel changes its URL, so re-run `pnpm share` (it rebuilds web).
- Anyone with the link can reach the app; all traffic runs against the local
  D1/R2 data and the machine must stay awake.
- Both sides are HTTPS, so there is no mixed-content blocking. CORS is
  allow-all in `apps/api/src/index.ts`.
- `pnpm share` refuses to start if port 3000 is already serving something
  (`pnpm web:dev`) — stop it or set `WEB_PORT=3001`.
- Admin is not shared by the script; it would need the same treatment on
  port 3002 with its own `NEXT_PUBLIC_API_URL`.
