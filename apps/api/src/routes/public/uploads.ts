import { Hono } from "hono";
import type { Env } from "../../index";

export const uploads = new Hono<{ Bindings: Env }>();

// Serves objects from the IMAGES binding. In production a public bucket base URL
// is used instead; this route is the read path for local dev (and a fallback).
uploads.get("/:key{.+}", async (c) => {
  const object = await c.env.IMAGES.get(c.req.param("key"));
  if (!object) return c.json({ error: "not_found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});
