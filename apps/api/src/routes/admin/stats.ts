import { Hono } from "hono";
import type { Env } from "../../index";

export const stats = new Hono<{ Bindings: Env }>();

stats.get("/", async (c) => c.json({ documents: 0, lawyers: 0, chunks: 0 }));
