import { ZPublicUser } from "@vidhan/schema";
import type {
  TAuthLogin,
  TAuthRegister,
  TAuthUpdate,
  TPublicUser,
} from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "./storage";

export type TAuthErrorCode =
  | "unauthorized"
  | "duplicate_email"
  | "validation_error"
  | "internal_error"
  | "network"
  | "unknown";

export class ApiError extends Error {
  readonly code: TAuthErrorCode;
  readonly status: number;

  constructor(code: TAuthErrorCode, status: number) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type TAuthResponse = { token: string; user: TPublicUser };

function isErrorCode(value: unknown): value is TAuthErrorCode {
  return (
    value === "unauthorized" ||
    value === "duplicate_email" ||
    value === "validation_error" ||
    value === "internal_error" ||
    value === "unknown"
  );
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(new URL(path, API_URL), init);
  } catch {
    throw new ApiError("network", 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (payload as { error?: unknown } | null)?.error;
    throw new ApiError(isErrorCode(code) ? code : "unknown", response.status);
  }
  return payload;
}

function parseAuthResponse(payload: unknown): TAuthResponse {
  const record = payload as { token?: unknown; user?: unknown } | null;
  if (!record || typeof record.token !== "string") {
    throw new ApiError("unknown", 200);
  }
  return { token: record.token, user: ZPublicUser.parse(record.user) };
}

export async function login(input: TAuthLogin): Promise<TAuthResponse> {
  return parseAuthResponse(await request("/auth/login", jsonPost(input)));
}

export async function register(input: TAuthRegister): Promise<TAuthResponse> {
  return parseAuthResponse(await request("/auth/register", jsonPost(input)));
}

export async function fetchMe(token: string): Promise<TPublicUser> {
  const payload = await request("/auth/me", {
    headers: { authorization: `Bearer ${token}` },
  });
  return ZPublicUser.parse((payload as { user?: unknown }).user);
}

export async function updateUser(input: TAuthUpdate): Promise<TPublicUser> {
  const token = readToken();
  const payload = await request("/auth/me", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  return ZPublicUser.parse((payload as { user?: unknown }).user);
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "unauthorized":
        return "Invalid email or password.";
      case "duplicate_email":
        return "An account with this email already exists.";
      case "network":
        return "Could not reach the server. Check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
