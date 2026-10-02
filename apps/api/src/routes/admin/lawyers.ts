import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { asJson, lawyers as lawyersTable, ZLawyerCreate, ZLawyerUpdate } from "@vidhan/schema";
import type { LawyerRow } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import { imageUrlFor } from "../../uploads/r2";

export const lawyers = new Hono<{ Bindings: Env }>();

function withImageUrl(row: LawyerRow, env: Env, origin: string) {
  return { ...row, imageUrl: imageUrlFor(env, origin, row.imageKey) };
}

// Drizzle wraps the D1 error, so walk the cause chain for the SQLite message.
function isDuplicateBarNumber(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    if (
      current.message.includes("UNIQUE") &&
      current.message.includes("bar_number")
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

lawyers.get("/", async (c) => {
  const activeParam = c.req.query("active");
  let active: boolean | undefined;
  if (activeParam !== undefined) {
    if (activeParam !== "true" && activeParam !== "false") {
      return c.json(
        { error: "validation_error", details: { active: "must be true or false" } },
        400,
      );
    }
    active = activeParam === "true";
  }

  const db = createDb(c.env.DB);
  const rows =
    active === undefined
      ? await db.select().from(lawyersTable)
      : await db.select().from(lawyersTable).where(eq(lawyersTable.active, active));
  const origin = new URL(c.req.url).origin;
  return c.json({ lawyers: rows.map((row) => withImageUrl(row, c.env, origin)) });
});

lawyers.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const row = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.id, c.req.param("id")))
    .get();
  if (!row) return c.json({ error: "not_found" }, 404);
  const origin = new URL(c.req.url).origin;
  return c.json({ lawyer: withImageUrl(row, c.env, origin) });
});

lawyers.post("/", async (c) => {
  const parsed = await parseJson(c, ZLawyerCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const now = new Date().toISOString();
  const row = {
    ...parsed.data,
    id: crypto.randomUUID(),
    languages: asJson(parsed.data.languages),
    bookingUrl: parsed.data.bookingUrl ?? null,
    barNumber: parsed.data.barNumber ?? null,
    yearsOfExperience: parsed.data.yearsOfExperience ?? null,
    bio: parsed.data.bio ?? null,
    imageKey: parsed.data.imageKey ?? null,
    verified: parsed.data.verified ?? false,
    active: parsed.data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(lawyersTable).values(row);
  } catch (err) {
    if (isDuplicateBarNumber(err)) {
      return c.json({ error: "duplicate_bar_number" }, 409);
    }
    throw err;
  }
  const origin = new URL(c.req.url).origin;
  return c.json({ lawyer: withImageUrl(row, c.env, origin) }, 201);
});

lawyers.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, ZLawyerUpdate);
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
    languages: parsed.data.languages ? asJson(parsed.data.languages) : existing.languages,
    updatedAt: new Date().toISOString(),
  };
  try {
    await db.update(lawyersTable).set(updated).where(eq(lawyersTable.id, id));
  } catch (err) {
    if (isDuplicateBarNumber(err)) {
      return c.json({ error: "duplicate_bar_number" }, 409);
    }
    throw err;
  }
  const origin = new URL(c.req.url).origin;
  return c.json({ lawyer: withImageUrl(updated, c.env, origin) });
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
