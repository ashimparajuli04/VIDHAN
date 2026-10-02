export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function apiGet(path: string): Promise<unknown> {
  const response = await fetch(new URL(path, API_URL));
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }
  return payload;
}
