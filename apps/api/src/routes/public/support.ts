import { Hono } from "hono";
import {
  ZSupportTicketCreate,
  ZSupportTicketMessageCreate,
} from "@vidhan/schema";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import { requireAuth, type TAuthContext } from "../../auth";
import {
  addMessage,
  createTicket,
  findTicket,
  listTickets,
} from "../../support";

export const support = new Hono<TAuthContext>();

support.use("*", requireAuth());

support.post("/tickets", async (c) => {
  const parsed = await parseJson(c, ZSupportTicketCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const ticket = await createTicket(db, c.get("user").id, parsed.data);
  return c.json({ ticket }, 201);
});

support.get("/tickets", async (c) => {
  const db = createDb(c.env.DB);
  const tickets = await listTickets(db, c.get("user").id);
  return c.json({ tickets });
});

support.get("/tickets/:id", async (c) => {
  const db = createDb(c.env.DB);
  const ticket = await findTicket(db, c.req.param("id"), c.get("user").id);
  if (!ticket) return c.json({ error: "not_found" }, 404);
  return c.json({ ticket });
});

support.post("/tickets/:id/messages", async (c) => {
  const parsed = await parseJson(c, ZSupportTicketMessageCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const ticket = await findTicket(db, c.req.param("id"), c.get("user").id);
  if (!ticket) return c.json({ error: "not_found" }, 404);
  const message = await addMessage(db, ticket.id, "user", parsed.data.body);
  if (!message) return c.json({ error: "not_found" }, 404);
  return c.json({ message }, 201);
});
