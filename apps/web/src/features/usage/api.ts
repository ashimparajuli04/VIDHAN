import { ZUsage } from "@vidhan/schema";
import type { TUsage } from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "@/features/auth/storage";

export class UsageApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`usage_request_failed_${status}`);
    this.name = "UsageApiError";
    this.status = status;
  }
}

export async function getUsage(): Promise<TUsage> {
  const headers = new Headers();
  const token = readToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(new URL("/usage", API_URL), { headers });
  } catch {
    throw new UsageApiError(0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new UsageApiError(response.status);
  return ZUsage.parse(payload);
}
