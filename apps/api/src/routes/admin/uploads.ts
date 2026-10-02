import { Hono } from "hono";
import type { Env } from "../../index";
import { parseJson, validationError } from "../../lib/validate";
import {
  IMAGE_CONTENT_TYPES,
  ZPresignRequest,
  createUploadTicket,
  hasS3Credentials,
} from "../../uploads/r2";
import type { TImageContentType } from "../../uploads/r2";

export const uploads = new Hono<{ Bindings: Env }>();

function isImageContentType(value: string | undefined): value is TImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value ?? "");
}

uploads.post("/presign", async (c) => {
  const parsed = await parseJson(c, ZPresignRequest);
  if (!parsed.ok) return validationError(c, parsed.error);

  const ticket = await createUploadTicket(
    c.env,
    {
      origin: new URL(c.req.url).origin,
      authorization: c.req.header("Authorization"),
    },
    parsed.data.contentType,
  );
  return c.json(ticket);
});

// Dev-only counterpart to the signed PUT. Disabled once S3 credentials exist.
uploads.put("/dev/:key{.+}", async (c) => {
  if (hasS3Credentials(c.env)) return c.json({ error: "not_found" }, 404);

  const contentType = c.req.header("Content-Type");
  if (!isImageContentType(contentType)) {
    return c.json({ error: "validation_error", details: { contentType: "unsupported" } }, 400);
  }

  const key = c.req.param("key");
  const body = await c.req.arrayBuffer();
  await c.env.IMAGES.put(key, body, { httpMetadata: { contentType } });
  return c.json({ ok: true });
});
