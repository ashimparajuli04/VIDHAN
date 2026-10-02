import { Hono } from "hono";
import type { Env } from "../../index";
import { lawyers } from "./lawyers";
import { documents } from "./documents";
import { stats } from "./stats";
import { uploads } from "./uploads";

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Compare digests so length mismatch can't short-circuit the loop.
async function secretMatches(provided: string, expected: string): Promise<boolean> {
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

// Split on the first colon only — passwords may contain colons.
function parseBasic(header: string | undefined): { user: string; pass: string } | null {
  const match = /^Basic\s+(.+)$/i.exec(header ?? "");
  if (!match) return null;
  let decoded: string;
  try {
    decoded = atob(match[1]!);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
}

adminRoutes.use("*", async (c, next) => {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = c.env;
  // Reject unconfigured credentials outright, else an empty user:pass would match.
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const creds = parseBasic(c.req.header("authorization"));
  // Always run both compares, even when creds is null, so timing doesn't reveal
  // which field failed.
  const [userOk, passOk] = await Promise.all([
    secretMatches(creds?.user ?? "", ADMIN_USERNAME),
    secretMatches(creds?.pass ?? "", ADMIN_PASSWORD),
  ]);
  if (!creds || !userOk || !passOk) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

adminRoutes.route("/lawyers", lawyers);
adminRoutes.route("/documents", documents);
adminRoutes.route("/stats", stats);
adminRoutes.route("/uploads", uploads);
