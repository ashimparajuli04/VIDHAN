import { Hono } from "hono";
import { createDb } from "../../db";
import { getUsage } from "../../usage";
import { requireAuth, type TAuthContext } from "../../auth";

export const usage = new Hono<TAuthContext>();

usage.use("*", requireAuth());

usage.get("/", async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await getUsage(db, c.get("user").id));
});
