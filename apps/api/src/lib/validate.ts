import type { Context } from "hono";
import type { z } from "zod/v4";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.ZodError };

export async function parseJson<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  const body = await c.req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
}

export function validationError(c: Context, error: z.ZodError) {
  return c.json(
    { error: "validation_error", details: error.flatten() },
    400,
  );
}
