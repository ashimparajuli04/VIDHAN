import { AwsClient } from "aws4fetch";
import { z } from "zod/v4";
import type { Env } from "../index";

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const ZPresignRequest = z.object({
  contentType: z.enum(IMAGE_CONTENT_TYPES),
});

const EXTENSIONS: Record<TImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_TTL_SECONDS = 600;

export type TUploadTicket = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
};

export function hasS3Credentials(env: Env): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_BUCKET_NAME &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY,
  );
}

export function createImageKey(contentType: TImageContentType): string {
  return `lawyers/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
}

export function imageUrlFor(
  env: Env,
  origin: string,
  imageKey: string | null,
): string | null {
  if (!imageKey) return null;
  return env.R2_PUBLIC_BASE_URL
    ? `${env.R2_PUBLIC_BASE_URL}/${imageKey}`
    : `${origin}/uploads/${imageKey}`;
}

export async function createUploadTicket(
  env: Env,
  context: { origin: string; authorization: string | undefined },
  contentType: TImageContentType,
): Promise<TUploadTicket> {
  const key = createImageKey(contentType);
  const headers: Record<string, string> = { "Content-Type": contentType };

  if (hasS3Credentials(env)) {
    const client = new AwsClient({
      service: "s3",
      region: "auto",
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });
    const url = new URL(
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`,
    );
    url.searchParams.set("X-Amz-Expires", String(UPLOAD_TTL_SECONDS));
    const signed = await client.sign(
      new Request(url, { method: "PUT", headers }),
      { aws: { signQuery: true } },
    );
    return {
      uploadUrl: signed.url.toString(),
      key,
      publicUrl: imageUrlFor(env, context.origin, key)!,
      method: "PUT",
      headers,
    };
  }

  // Miniflare's local R2 has no S3 endpoint, so dev uploads go back through the
  // Worker's IMAGES binding. The incoming Basic auth is echoed so the client can
  // reuse the same PUT-with-returned-headers flow as the signed path.
  if (context.authorization) headers.Authorization = context.authorization;
  return {
    uploadUrl: `${context.origin}/admin/uploads/dev/${key}`,
    key,
    publicUrl: imageUrlFor(env, context.origin, key)!,
    method: "PUT",
    headers,
  };
}
