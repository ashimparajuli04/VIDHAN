import { and, asc, desc, eq } from "drizzle-orm";
import {
  supportTicketMessages as messagesTable,
  supportTickets as ticketsTable,
  users,
} from "@vidhan/schema";
import type {
  SupportTicketMessageRow,
  SupportTicketRow,
  TAdminSupportTicket,
  TAdminSupportTicketDetail,
  TSupportTicket,
  TSupportTicketCategory,
  TSupportTicketDetail,
  TSupportTicketMessage,
  TSupportTicketSource,
  TSupportTicketStatus,
  TSupportTicketUser,
} from "@vidhan/schema";
import type { Db } from "../db";

export type TCreateTicketInput = {
  subject?: string;
  message: string;
  category: TSupportTicketCategory;
  source: TSupportTicketSource;
};

function toTicket(row: SupportTicketRow): TSupportTicket {
  return {
    id: row.id,
    subject: row.subject,
    category: row.category,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMessage(row: SupportTicketMessageRow): TSupportTicketMessage {
  return {
    id: row.id,
    authorRole: row.authorRole,
    body: row.body,
    createdAt: row.createdAt,
  };
}

function toUser(row: typeof users.$inferSelect): TSupportTicketUser {
  return { id: row.id, name: row.name, email: row.email };
}

// Subject is derived from the body when the caller omits one; a ticket has no
// separate title field the user is forced to fill.
function deriveSubject(message: string): string {
  const firstLine = message.split("\n")[0]?.trim() ?? "";
  const base = firstLine.length > 0 ? firstLine : message.trim();
  return base.length > 120 ? `${base.slice(0, 117)}...` : base;
}

export async function listTickets(
  db: Db,
  userId: string,
): Promise<TSupportTicket[]> {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.userId, userId))
    .orderBy(desc(ticketsTable.updatedAt));
  return rows.map(toTicket);
}

export async function listAllTickets(
  db: Db,
  status?: TSupportTicketStatus,
): Promise<TAdminSupportTicket[]> {
  const rows = await db
    .select({ ticket: ticketsTable, user: users })
    .from(ticketsTable)
    .innerJoin(users, eq(ticketsTable.userId, users.id))
    .where(status ? eq(ticketsTable.status, status) : undefined)
    .orderBy(desc(ticketsTable.updatedAt));
  return rows.map(({ ticket, user }) => ({
    ...toTicket(ticket),
    user: toUser(user),
  }));
}

export async function findTicket(
  db: Db,
  id: string,
  userId: string,
): Promise<TSupportTicketDetail | null> {
  const row = await db
    .select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.id, id), eq(ticketsTable.userId, userId)))
    .get();
  if (!row) return null;
  return { ...toTicket(row), messages: await listMessages(db, id) };
}

export async function findTicketForAdmin(
  db: Db,
  id: string,
): Promise<TAdminSupportTicketDetail | null> {
  const row = await db
    .select({ ticket: ticketsTable, user: users })
    .from(ticketsTable)
    .innerJoin(users, eq(ticketsTable.userId, users.id))
    .where(eq(ticketsTable.id, id))
    .get();
  if (!row) return null;
  return {
    ...toTicket(row.ticket),
    user: toUser(row.user),
    messages: await listMessages(db, id),
  };
}

function listMessages(db: Db, ticketId: string): Promise<TSupportTicketMessage[]> {
  return db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.ticketId, ticketId))
    .orderBy(asc(messagesTable.createdAt))
    .then((rows) => rows.map(toMessage));
}

export async function createTicket(
  db: Db,
  userId: string,
  input: TCreateTicketInput,
): Promise<TSupportTicket> {
  // The opening message is the dedupe key: same user, open ticket, same
  // category and body returns the existing row instead of a duplicate.
  const openTickets = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.userId, userId),
        eq(ticketsTable.status, "open"),
        eq(ticketsTable.category, input.category),
      ),
    );
  for (const ticket of openTickets) {
    const first = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.ticketId, ticket.id))
      .orderBy(asc(messagesTable.createdAt))
      .limit(1)
      .get();
    if (first?.authorRole === "user" && first.body === input.message) {
      return toTicket(ticket);
    }
  }

  const now = new Date().toISOString();
  const ticketRow: SupportTicketRow = {
    id: crypto.randomUUID(),
    userId,
    subject: input.subject?.trim() || deriveSubject(input.message),
    category: input.category,
    source: input.source,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(ticketsTable).values(ticketRow);
  await db.insert(messagesTable).values({
    id: crypto.randomUUID(),
    ticketId: ticketRow.id,
    authorRole: "user",
    body: input.message,
    createdAt: now,
  });
  return toTicket(ticketRow);
}

export async function addMessage(
  db: Db,
  ticketId: string,
  authorRole: "user" | "admin",
  body: string,
): Promise<TSupportTicketMessage | null> {
  const ticket = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .get();
  if (!ticket) return null;

  const now = new Date().toISOString();
  const row: SupportTicketMessageRow = {
    id: crypto.randomUUID(),
    ticketId,
    authorRole,
    body,
    createdAt: now,
  };
  await db.insert(messagesTable).values(row);
  // A user follow-up on a closed ticket reopens it; an admin reply does not,
  // so an admin can answer without pulling the ticket back into the queue.
  const status =
    authorRole === "user" && ticket.status === "closed" ? "open" : ticket.status;
  await db
    .update(ticketsTable)
    .set({ status, updatedAt: now })
    .where(eq(ticketsTable.id, ticketId));
  return toMessage(row);
}

export async function setStatus(
  db: Db,
  ticketId: string,
  status: TSupportTicketStatus,
): Promise<TSupportTicket | null> {
  const existing = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .get();
  if (!existing) return null;
  const now = new Date().toISOString();
  await db
    .update(ticketsTable)
    .set({ status, updatedAt: now })
    .where(eq(ticketsTable.id, ticketId));
  return toTicket({ ...existing, status, updatedAt: now });
}
