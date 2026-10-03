import { Hono } from "hono";
import {
  SUPPORT_TICKET_STATUSES,
  ZSupportTicketMessageCreate,
  ZSupportTicketStatusUpdate,
} from "@vidhan/schema";
import type { TSupportTicketStatus } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import {
  addMessage,
  findTicketForAdmin,
  listAllTickets,
  setStatus,
} from "../../support";

export const support = new Hono<{ Bindings: Env }>();

const isStatus = (value: string): value is TSupportTicketStatus =>
  (SUPPORT_TICKET_STATUSES as readonly string[]).includes(value);

support.get("/tickets", async (c) => {
  const rawStatus = c.req.query("status");
  if (rawStatus !== undefined && !isStatus(rawStatus)) {
    return c.json(
      { error: "validation_error", details: { status: "must be open or closed" } },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const tickets = await listAllTickets(db, rawStatus);
  return c.json({ tickets });
});

support.get("/tickets/:id", async (c) => {
  const db = createDb(c.env.DB);
  const ticket = await findTicketForAdmin(db, c.req.param("id"));
  if (!ticket) return c.json({ error: "not_found" }, 404);
  return c.json({ ticket });
});

support.post("/tickets/:id/messages", async (c) => {
  const parsed = await parseJson(c, ZSupportTicketMessageCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const message = await addMessage(db, c.req.param("id"), "admin", parsed.data.body);
  if (!message) return c.json({ error: "not_found" }, 404);
  return c.json({ message }, 201);
});

support.patch("/tickets/:id", async (c) => {
  const parsed = await parseJson(c, ZSupportTicketStatusUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const ticket = await setStatus(db, c.req.param("id"), parsed.data.status);
  if (!ticket) return c.json({ error: "not_found" }, 404);
  return c.json({ ticket });
});
