import { getAuthHeader } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

type TApiErrorEnvelope = { error: string; details?: unknown };

function isErrorEnvelope(value: unknown): value is TApiErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get unauthorized(): boolean {
    return this.status === 401;
  }
}

export type TApiRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
};

export async function apiFetch(
  path: string,
  request: TApiRequest = {},
): Promise<unknown> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {};
  if (request.body !== undefined) headers["Content-Type"] = "application/json";
  if (request.auth !== false) {
    const auth = getAuthHeader();
    if (auth) headers.Authorization = auth;
  }

  const response = await fetch(url, {
    method: request.method ?? "GET",
    headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw isErrorEnvelope(payload)
      ? new ApiError(response.status, payload.error, payload.details)
      : new ApiError(response.status, `http_${response.status}`);
  }
  return payload;
}
