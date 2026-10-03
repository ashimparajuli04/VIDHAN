import {
  ZSupportTicket,
  ZSupportTicketDetail,
  ZSupportTicketMessage,
} from "@vidhan/schema";
import type {
  TSupportTicket,
  TSupportTicketCategory,
  TSupportTicketDetail,
  TSupportTicketMessage,
  TSupportTicketSource,
} from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "@/features/auth/storage";

export class SupportApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`support_request_failed_${status}`);
    this.name = "SupportApiError";
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
    throw new SupportApiError(0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new SupportApiError(response.status);
  return payload;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type TCreateTicketInput = {
  subject?: string;
  message: string;
  category: TSupportTicketCategory;
  source: TSupportTicketSource;
};

export async function createTicket(
  input: TCreateTicketInput
): Promise<TSupportTicket> {
  const payload = (await postJson("/support/tickets", input)) as {
    ticket?: unknown;
  };
  return ZSupportTicket.parse(payload.ticket);
}

export async function listTickets(): Promise<TSupportTicket[]> {
  const payload = (await request("/support/tickets")) as { tickets?: unknown };
  if (!Array.isArray(payload.tickets)) throw new SupportApiError(0);
  return payload.tickets.map((item) => ZSupportTicket.parse(item));
}

export async function getTicket(id: string): Promise<TSupportTicketDetail | null> {
  let payload: unknown;
  try {
    payload = await request(`/support/tickets/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof SupportApiError && error.status === 404) return null;
    throw error;
  }
  return ZSupportTicketDetail.parse((payload as { ticket?: unknown }).ticket);
}

export async function replyToTicket(
  id: string,
  body: string
): Promise<TSupportTicketMessage> {
  const payload = (await postJson(
    `/support/tickets/${encodeURIComponent(id)}/messages`,
    { body }
  )) as { message?: unknown };
  return ZSupportTicketMessage.parse(payload.message);
}
