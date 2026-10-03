# Testing on a phone from the same LAN

## Decisions

- `apps/api/wrangler.toml` has `[dev] ip = "0.0.0.0", port = 8787`, so
  `wrangler dev` is always reachable from other devices on the LAN. Without
  this it binds loopback only and the phone can never reach the API.
- The API base URL in `apps/web` and `apps/admin`
  (`src/lib/api.ts` → `API_URL`) is derived at runtime from
  `window.location.hostname` with port `8787`. This works from any device
  regardless of the IP the site was opened on. `NEXT_PUBLIC_API_URL` still
  overrides it for deployed environments (it is inlined at build time, so a
  static export built with it must use a reachable, absolute URL).

## Running

```bash
pnpm dev:api   # binds 0.0.0.0:8787
pnpm dev:web   # serves on *:3000
```

Open `http://<machine-lan-ip>:3000` on the phone (same Wi-Fi). Verify the API
is reachable from the phone by opening `http://<machine-lan-ip>:8787` — it
should return `{"ok":true,"service":"vidhan-api"}`.

## Gotchas

- If the phone cannot reach the API, check the firewall allows incoming
  connections to port 8787 (`workerd`).
- If the site is ever served over HTTPS (e.g. a tunnel), the API must also be
  HTTPS — the derived URL matches the page's protocol, so an HTTP API behind
  an HTTPS page would be blocked as mixed content.
- A build-time `NEXT_PUBLIC_API_URL` in a static export beats the runtime
  derivation — do not set it to `localhost`-based values for LAN testing.