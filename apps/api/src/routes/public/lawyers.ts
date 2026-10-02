import { Hono } from "hono";

export const lawyers = new Hono();

lawyers.get("/", async (c) => {
  return c.json({ lawyers: [] });
});
