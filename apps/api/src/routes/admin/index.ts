import { Hono } from "hono";
import type { Env } from "../../index";
import { lawyers } from "./lawyers";
import { documents } from "./documents";
import { stats } from "./stats";

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.use("*", async (c, next) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

adminRoutes.route("/lawyers", lawyers);
adminRoutes.route("/documents", documents);
adminRoutes.route("/stats", stats);
