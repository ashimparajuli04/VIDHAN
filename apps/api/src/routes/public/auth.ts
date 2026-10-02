import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { ZAuthLogin, ZAuthRegister, ZAuthUpdate, users } from "@vidhan/schema";
import type { TLanguage } from "@vidhan/schema";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import {
  DUMMY_PASSWORD_HASH,
  findByEmail,
  hashPassword,
  isDuplicateEmailError,
  requireAuth,
  signJwt,
  toPublicUser,
  verifyPassword,
  type TAuthContext,
} from "../../auth";

export const auth = new Hono<TAuthContext>();

auth.post("/register", async (c) => {
  const parsed = await parseJson(c, ZAuthRegister);
  if (!parsed.ok) return validationError(c, parsed.error);
  if (!c.env.JWT_SECRET) return c.json({ error: "internal_error" }, 500);

  const db = createDb(c.env.DB);
  if (await findByEmail(parsed.data.email, db)) {
    return c.json({ error: "duplicate_email" }, 409);
  }

  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    name: parsed.data.name,
    district: null,
    language: "en",
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.insert(users).values(row);
  } catch (err) {
    if (isDuplicateEmailError(err)) return c.json({ error: "duplicate_email" }, 409);
    throw err;
  }
  const token = await signJwt(row.id, c.env.JWT_SECRET);
  return c.json({ token, user: toPublicUser(row) }, 201);
});

auth.post("/login", async (c) => {
  const parsed = await parseJson(c, ZAuthLogin);
  if (!parsed.ok) return validationError(c, parsed.error);
  if (!c.env.JWT_SECRET) return c.json({ error: "internal_error" }, 500);

  const db = createDb(c.env.DB);
  const row = await findByEmail(parsed.data.email, db);
  const ok = await verifyPassword(parsed.data.password, row?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!row || !ok) return c.json({ error: "unauthorized" }, 401);

  const token = await signJwt(row.id, c.env.JWT_SECRET);
  return c.json({ token, user: toPublicUser(row) });
});

auth.get("/me", requireAuth(), (c) => c.json({ user: c.get("user") }));

auth.patch("/me", requireAuth(), async (c) => {
  const parsed = await parseJson(c, ZAuthUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const user = c.get("user");
  const db = createDb(c.env.DB);
  const updated = {
    name: parsed.data.name ?? user.name,
    district: parsed.data.district === undefined ? user.district : parsed.data.district,
    language: (parsed.data.language ?? user.language) as TLanguage,
    updatedAt: new Date().toISOString(),
  };
  await db.update(users).set(updated).where(eq(users.id, user.id));
  return c.json({ user: { ...user, ...updated } });
});
