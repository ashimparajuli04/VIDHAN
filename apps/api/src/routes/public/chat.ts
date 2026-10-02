import { Hono } from "hono";

export const chat = new Hono();

chat.post("/", async (c) => {
  return c.json({ error: "not_implemented" }, 501);
});
