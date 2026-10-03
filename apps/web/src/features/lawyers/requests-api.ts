import { ZPublicLawyerRequest } from "@vidhan/schema";
import type {
  TLawyerRequestCreate,
  TPublicLawyerRequest,
} from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "@/features/auth/storage";

export class LawyerRequestApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`lawyer_request_failed_${status}`);
    this.name = "LawyerRequestApiError";
    this.status = status;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  const token = readToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(new URL(path, API_URL), { ...init, headers });
  } catch {
    throw new LawyerRequestApiError(0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new LawyerRequestApiError(response.status);
  return payload;
}

export async function createLawyerRequest(
  input: TLawyerRequestCreate
): Promise<TPublicLawyerRequest> {
  const payload = (await request("/lawyer-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })) as { request?: unknown };
  return ZPublicLawyerRequest.parse(payload.request);
}

export async function getMyLawyerRequests(): Promise<TPublicLawyerRequest[]> {
  const payload = (await request("/lawyer-requests")) as { requests?: unknown };
  if (!Array.isArray(payload.requests)) throw new LawyerRequestApiError(0);
  return payload.requests.map((item) => ZPublicLawyerRequest.parse(item));
}
