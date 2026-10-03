import { ZChatMessage, ZChatSession } from "@vidhan/schema";
import type { TChatMessage, TChatSession } from "@vidhan/schema";

import { API_URL } from "@/lib/api";
import { readToken } from "@/features/auth/storage";

export class ChatApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`chat_request_failed_${status}`);
    this.name = "ChatApiError";
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
    throw new ChatApiError(0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ChatApiError(response.status);
  return payload;
}

export async function createSession(): Promise<TChatSession> {
  const payload = (await request("/chat/sessions", { method: "POST" })) as {
    session?: unknown;
  };
  return ZChatSession.parse(payload.session);
}

export async function listSessions(): Promise<TChatSession[]> {
  const payload = (await request("/chat/sessions")) as { sessions?: unknown };
  if (!Array.isArray(payload.sessions)) throw new ChatApiError(0);
  return payload.sessions.map((item) => ZChatSession.parse(item));
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/chat/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSession(
  id: string
): Promise<{ session: TChatSession; messages: TChatMessage[] }> {
  const payload = (await request(`/chat/sessions/${encodeURIComponent(id)}`)) as {
    session?: unknown;
    messages?: unknown;
  };
  const session = ZChatSession.parse(payload.session);
  if (!Array.isArray(payload.messages)) throw new ChatApiError(0);
  return { session, messages: payload.messages.map((item) => ZChatMessage.parse(item)) };
}
