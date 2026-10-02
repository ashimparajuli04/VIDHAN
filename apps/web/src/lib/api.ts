// API (wrangler dev) runs on the same host as the site on port 8787; the
// hostname is derived at runtime so it works from any device on the LAN.
// NEXT_PUBLIC_API_URL overrides it for deployed environments.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window === "undefined"
    ? "http://localhost:8787"
    : `${window.location.protocol}//${window.location.hostname}:8787`);

export async function apiGet(path: string): Promise<unknown> {
  const response = await fetch(new URL(path, API_URL));
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }
  return payload;
}
