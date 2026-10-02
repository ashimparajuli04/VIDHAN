import { Hono } from "hono";
import type { Env } from "../../index";

export const documents = new Hono<{ Bindings: Env }>();

documents.get("/", async (c) => c.json({ documents: [] }));

documents.post("/", async (c) => c.json({ error: "not_implemented" }, 501));

documents.post("/:id/reindex", async (c) => c.json({ error: "not_implemented" }, 501));
