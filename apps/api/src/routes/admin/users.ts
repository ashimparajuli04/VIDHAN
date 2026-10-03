import { Hono } from "hono";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { users as usersTable, ZAdminUserUpdate } from "@vidhan/schema";
import type { TAdminUser, UserRow } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";

export const users = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 20;

function toAdminUser(row: UserRow): TAdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isSubscribed: row.isSubscribed,
    createdAt: row.createdAt,
  };
}

users.get("/", async (c) => {
  const page = Number(c.req.query("page") ?? "1");
  if (!Number.isInteger(page) || page < 1) {
    return c.json(
      { error: "validation_error", details: { page: "must be a positive integer" } },
      400,
    );
  }
  const search = c.req.query("search")?.trim() ?? "";

  const db = createDb(c.env.DB);
  const filter = search
    ? or(like(usersTable.email, `%${search}%`), like(usersTable.name, `%${search}%`))
    : undefined;

  const [countRow, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(filter).get(),
    db
      .select()
      .from(usersTable)
      .where(filter)
      .orderBy(desc(usersTable.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  return c.json({
    users: rows.map(toAdminUser),
    total: countRow?.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
});

users.patch("/:id", async (c) => {
  const parsed = await parseJson(c, ZAdminUserUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).get();
  if (!existing) return c.json({ error: "not_found" }, 404);

  await db
    .update(usersTable)
    .set({ isSubscribed: parsed.data.isSubscribed, updatedAt: new Date().toISOString() })
    .where(eq(usersTable.id, id));

  return c.json({
    user: toAdminUser({ ...existing, isSubscribed: parsed.data.isSubscribed }),
  });
});
