import { Hono } from "hono";
import type { Env } from "../../index";

export const lawyers = new Hono<{ Bindings: Env }>();

lawyers.get("/", async (c) => c.json({ lawyers: [] }));

lawyers.post("/", async (c) => c.json({ error: "not_implemented" }, 501));

lawyers.put("/:id", async (c) => c.json({ error: "not_implemented" }, 501));

lawyers.delete("/:id", async (c) => c.json({ error: "not_implemented" }, 501));
