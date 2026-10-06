#!/usr/bin/env bash
#
# Share the built web app + local API with someone outside your network.
# The API dev server must already be running (pnpm dev:api).
#
# Quick tunnels expose one port each, so the API gets its own tunnel and its
# URL is baked into the web static export at build time.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-8787}"
WEB_PORT="${WEB_PORT:-3000}"
LOG_DIR="$(mktemp -d)"
PIDS=()

kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$1" 2>/dev/null || true
}

cleanup() {
  trap - EXIT INT TERM
  if ((${#PIDS[@]})); then
    for pid in "${PIDS[@]}"; do
      kill_tree "$pid"
    done
    wait 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

wait_for_tunnel_url() {
  local log="$1" pid="$2" url=""
  for _ in $(seq 1 60); do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -n1 || true)"
    if [[ -n "$url" ]]; then
      printf '%s\n' "$url"
      return 0
    fi
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  printf 'error: timed out waiting for a tunnel URL. Last log lines (%s):\n' "$log" >&2
  tail -n 20 "$log" >&2
  exit 1
}

command -v cloudflared >/dev/null \
  || die "cloudflared is not installed. Install it: sudo pacman -S cloudflared"

curl -fsS "http://localhost:${API_PORT}/" >/dev/null \
  || die "API not reachable on :${API_PORT}. Start it first: pnpm dev:api"

if curl -fsS --max-time 2 "http://localhost:${WEB_PORT}/" >/dev/null 2>&1; then
  die "something is already serving :${WEB_PORT} (pnpm web:dev?). Stop it or set WEB_PORT=3001."
fi

printf '==> Tunneling API on :%s ...\n' "$API_PORT"
cloudflared tunnel --url "http://localhost:${API_PORT}" >"$LOG_DIR/api-tunnel.log" 2>&1 &
API_TUNNEL_PID=$!
PIDS+=("$API_TUNNEL_PID")
API_URL="$(wait_for_tunnel_url "$LOG_DIR/api-tunnel.log" "$API_TUNNEL_PID")"

printf '==> Building web with NEXT_PUBLIC_API_URL=%s\n' "$API_URL"
NEXT_PUBLIC_API_URL="$API_URL" pnpm --filter @vidhan/web build
[[ -f apps/web/out/index.html ]] || die "build did not produce apps/web/out/index.html"

printf '==> Serving apps/web/out on :%s ...\n' "$WEB_PORT"
npx --yes serve@14 -n -s apps/web/out -l "$WEB_PORT" >"$LOG_DIR/serve.log" 2>&1 &
SERVE_PID=$!
PIDS+=("$SERVE_PID")

for _ in $(seq 1 30); do
  curl -fsS "http://localhost:${WEB_PORT}/" >/dev/null 2>&1 && break
  kill -0 "$SERVE_PID" 2>/dev/null || { tail -n 20 "$LOG_DIR/serve.log" >&2; die "static server exited"; }
  sleep 0.5
done
curl -fsS "http://localhost:${WEB_PORT}/" >/dev/null 2>&1 \
  || { tail -n 20 "$LOG_DIR/serve.log" >&2; die "static server is not responding"; }

printf '==> Tunneling web on :%s ...\n' "$WEB_PORT"
cloudflared tunnel --url "http://localhost:${WEB_PORT}" >"$LOG_DIR/web-tunnel.log" 2>&1 &
WEB_TUNNEL_PID=$!
PIDS+=("$WEB_TUNNEL_PID")
WEB_URL="$(wait_for_tunnel_url "$LOG_DIR/web-tunnel.log" "$WEB_TUNNEL_PID")"

cat <<EOF

Share this URL with your friend:

  ${WEB_URL}

API tunnel (baked into the build): ${API_URL}

Keep this running. Ctrl+C stops both tunnels and the static server.
Logs: ${LOG_DIR}
EOF

wait
