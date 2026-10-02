import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  lawyers as lawyersTable,
  lawyerCreateSchema,
  lawyerUpdateSchema,
} from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";

export const lawyers = new Hono<{ Bindings: Env }>();

lawyers.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.active, true));
  return c.json({ lawyers: rows });
});

lawyers.post("/", async (c) => {
  const parsed = await parseJson(c, lawyerCreateSchema);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(lawyersTable).values(row);
  return c.json({ lawyer: row }, 201);
});

lawyers.put("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, lawyerUpdateSchema);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const existing = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.id, id))
    .get();
  if (!existing) return c.json({ error: "not_found" }, 404);

  const updated = {
    ...existing,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };
  await db.update(lawyersTable).set(updated).where(eq(lawyersTable.id, id));
  return c.json({ lawyer: updated });
});

lawyers.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const existing = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.id, id))
    .get();
  if (!existing) return c.json({ error: "not_found" }, 404);

  await db
    .update(lawyersTable)
    .set({ active: false, updatedAt: new Date().toISOString() })
    .where(eq(lawyersTable.id, id));
  return c.json({ ok: true });
});
