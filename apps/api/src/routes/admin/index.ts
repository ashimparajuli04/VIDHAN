import { Hono } from "hono";
import type { Env } from "../../index";
import { lawyers } from "./lawyers";
import { documents } from "./documents";
import { stats } from "./stats";

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Compare digests so length mismatch can't short-circuit the loop.
async function tokenMatches(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i]! ^ bv[i]!;
  return diff === 0;
}

adminRoutes.use("*", async (c, next) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !c.env.ADMIN_TOKEN || !(await tokenMatches(token, c.env.ADMIN_TOKEN))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

adminRoutes.route("/lawyers", lawyers);
adminRoutes.route("/documents", documents);
adminRoutes.route("/stats", stats);
