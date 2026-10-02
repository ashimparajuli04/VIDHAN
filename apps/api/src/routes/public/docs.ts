import { Hono } from "hono";

export const docs = new Hono();

docs.get("/:id", async (c) => {
  const id = c.req.param("id");
  return c.json({ id, error: "not_implemented" }, 501);
});
