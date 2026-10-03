import { z } from "zod/v4";
import {
  ZAdminSupportTicket,
  ZAdminSupportTicketDetail,
  ZSupportTicketMessage,
} from "@vidhan/schema";
import type {
  TAdminSupportTicket,
  TAdminSupportTicketDetail,
  TSupportTicketMessage,
  TSupportTicketStatus,
} from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZTicketList = z.object({ tickets: z.array(ZAdminSupportTicket) });
const ZTicketEnvelope = z.object({ ticket: ZAdminSupportTicketDetail });
const ZMessageEnvelope = z.object({ message: ZSupportTicketMessage });

export async function listSupportTickets(
  status?: TSupportTicketStatus,
): Promise<TAdminSupportTicket[]> {
  const payload = await apiFetch("/admin/support/tickets", {
    query: status === undefined ? {} : { status },
  });
  return ZTicketList.parse(payload).tickets;
}

export async function getSupportTicket(
  id: string,
): Promise<TAdminSupportTicketDetail> {
  const payload = await apiFetch(
    `/admin/support/tickets/${encodeURIComponent(id)}`,
  );
  return ZTicketEnvelope.parse(payload).ticket;
}

export async function replyToSupportTicket(
  id: string,
  body: string,
): Promise<TSupportTicketMessage> {
  const payload = await apiFetch(
    `/admin/support/tickets/${encodeURIComponent(id)}/messages`,
    { method: "POST", body: { body } },
  );
  return ZMessageEnvelope.parse(payload).message;
}

export async function updateSupportTicketStatus(
  id: string,
  status: TSupportTicketStatus,
): Promise<TAdminSupportTicketDetail> {
  const payload = await apiFetch(
    `/admin/support/tickets/${encodeURIComponent(id)}`,
    { method: "PATCH", body: { status } },
  );
  return ZTicketEnvelope.parse(payload).ticket;
}
