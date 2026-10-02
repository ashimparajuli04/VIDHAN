import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { lawyers as lawyersTable } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";

export const lawyers = new Hono<{ Bindings: Env }>();

lawyers.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.active, true));
  return c.json({ lawyers: rows });
});
