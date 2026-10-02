import { z } from "zod/v4";
import { apiFetch } from "@/lib/api";

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ZUploadTicket = z.object({
  uploadUrl: z.string(),
  key: z.string(),
  publicUrl: z.string(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
});

export type TUploadedImage = { key: string; publicUrl: string };

function isImageContentType(value: string): value is TImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export async function uploadImage(file: File): Promise<TUploadedImage> {
  if (!isImageContentType(file.type)) throw new Error("unsupported_type");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("too_large");

  const ticket = ZUploadTicket.parse(
    await apiFetch("/admin/uploads/presign", {
      method: "POST",
      body: { contentType: file.type },
    }),
  );

  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: file,
  });
  if (!response.ok) throw new Error("upload_failed");

  return { key: ticket.key, publicUrl: ticket.publicUrl };
}
