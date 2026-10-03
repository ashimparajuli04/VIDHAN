import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { asJson, chatMessages, chatSessions } from "@vidhan/schema";
import type {
  TChatMessage,
  TChatSession,
  TReference,
  TToolCall,
  TToolResult,
} from "@vidhan/schema";
import type { Db } from "../db";

function toSession(row: typeof chatSessions.$inferSelect): TChatSession {
  return row;
}

export function toChatMessage(row: typeof chatMessages.$inferSelect): TChatMessage {
  return {
    ...row,
    toolCalls: row.toolCalls ? [...row.toolCalls] : null,
    toolResults: row.toolResults ? [...row.toolResults] : null,
    references: row.references ? [...row.references] : null,
  };
}

export async function createSession(db: Db, userId: string): Promise<TChatSession> {
  const now = new Date().toISOString();
  const row = { id: crypto.randomUUID(), userId, title: "New chat", createdAt: now, updatedAt: now };
  await db.insert(chatSessions).values(row);
  return toSession(row);
}

export async function findSession(
  db: Db,
  id: string,
  userId: string,
): Promise<TChatSession | null> {
  const row = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .get();
  return row ? toSession(row) : null;
}

// Sidebar excludes empty "New chat" rows, so a session may exist before it first appears.
export async function listSessions(db: Db, userId: string): Promise<TChatSession[]> {
  const idsWithMessages = db
    .selectDistinct({ sessionId: chatMessages.sessionId })
    .from(chatMessages);
  const rows = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        inArray(chatSessions.id, idsWithMessages),
      ),
    )
    .orderBy(desc(chatSessions.updatedAt));
  return rows.map(toSession);
}

export async function listMessages(db: Db, sessionId: string): Promise<TChatMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));
  return rows.map(toChatMessage);
}

export async function deleteSession(db: Db, id: string, userId: string): Promise<boolean> {
  const existing = await findSession(db, id, userId);
  if (!existing) return false;
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
  await db.delete(chatSessions).where(eq(chatSessions.id, id));
  return true;
}

export async function insertUserMessage(
  db: Db,
  sessionId: string,
  content: string,
): Promise<TChatMessage> {
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    sessionId,
    role: "user" as const,
    content,
    toolCalls: null,
    toolResults: null,
    references: null,
    reasoning: null,
    createdAt: now,
  };
  await db.insert(chatMessages).values(row);
  return toChatMessage(row);
}

export async function insertAssistantMessage(
  db: Db,
  sessionId: string,
  content: string,
  toolCalls: TToolCall[] | null,
  toolResults: TToolResult[] | null,
  references: TReference[] | null,
  reasoning: string | null,
): Promise<TChatMessage> {
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    sessionId,
    role: "assistant" as const,
    content,
    toolCalls: toolCalls ? asJson(toolCalls) : null,
    toolResults: toolResults ? asJson(toolResults) : null,
    references: references ? asJson(references) : null,
    reasoning,
    createdAt: now,
  };
  await db.insert(chatMessages).values(row);
  return toChatMessage(row);
}

export async function touchSession(
  db: Db,
  id: string,
  patch: { title?: string; updatedAt: string },
): Promise<void> {
  await db.update(chatSessions).set(patch).where(eq(chatSessions.id, id));
}
