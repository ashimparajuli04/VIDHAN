import {
  ZEnterpriseMemberView,
  ZEnterpriseMembership,
  ZEnterpriseOrganizationDetail,
  ZEnterpriseRequest,
} from "@vidhan/schema";
import type {
  TEnterpriseMemberStatus,
  TEnterpriseMemberView,
  TEnterpriseMembership,
  TEnterpriseOrganizationDetail,
  TEnterpriseRequest,
  TEnterpriseRequestCreate,
} from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "@/features/auth/storage";

export class EnterpriseApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code = "unknown") {
    super(code);
    this.name = "EnterpriseApiError";
    this.status = status;
    this.code = code;
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
    throw new EnterpriseApiError(0, "network");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "unknown";
    throw new EnterpriseApiError(response.status, code);
  }
  return payload;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createEnterpriseRequest(
  input: TEnterpriseRequestCreate,
): Promise<TEnterpriseRequest> {
  const payload = (await postJson("/enterprise/requests", input)) as {
    request?: unknown;
  };
  return ZEnterpriseRequest.parse(payload.request);
}

export async function listMyRequests(): Promise<TEnterpriseRequest[]> {
  const payload = (await request("/enterprise/requests/mine")) as {
    requests?: unknown;
  };
  if (!Array.isArray(payload.requests)) throw new EnterpriseApiError(0, "bad_body");
  return payload.requests.map((item) => ZEnterpriseRequest.parse(item));
}

export async function getMembership(): Promise<TEnterpriseMembership | null> {
  const payload = (await request("/enterprise/membership")) as {
    membership?: unknown;
  };
  if (payload.membership === null || payload.membership === undefined) {
    return null;
  }
  return ZEnterpriseMembership.parse(payload.membership);
}

export async function getOrganization(): Promise<TEnterpriseOrganizationDetail | null> {
  let payload: unknown;
  try {
    payload = await request("/enterprise/organization");
  } catch (error) {
    if (error instanceof EnterpriseApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
  return ZEnterpriseOrganizationDetail.parse(
    (payload as { organization?: unknown }).organization,
  );
}

export async function addEnterpriseMember(
  email: string,
): Promise<{ member: TEnterpriseMemberView; invited: boolean }> {
  const payload = (await postJson("/enterprise/members", { email })) as {
    member?: unknown;
    invited?: unknown;
  };
  return {
    member: ZEnterpriseMemberView.parse(payload.member),
    invited: payload.invited === true,
  };
}

export async function updateEnterpriseMemberStatus(
  id: string,
  status: TEnterpriseMemberStatus,
): Promise<TEnterpriseMemberView> {
  const payload = (await request(
    `/enterprise/members/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    },
  )) as { member?: unknown };
  return ZEnterpriseMemberView.parse(payload.member);
}