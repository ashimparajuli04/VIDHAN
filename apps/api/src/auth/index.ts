import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { z } from "zod/v4";
import { users } from "@vidhan/schema";
import type { TDistrict, TLanguage, TPublicUser, UserRow } from "@vidhan/schema";
import { createDb } from "../db";
import type { Env } from "../index";

export type TAuthContext = {
  Bindings: Env;
  Variables: { user: TPublicUser };
};

const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = "pbkdf2";
const JWT_TTL_SECONDS = 7 * 24 * 60 * 60;

const ZJwtPayload = z.object({
  sub: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type TJwtPayload = z.infer<typeof ZJwtPayload>;

export function toPublicUser(row: UserRow): TPublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    district: row.district as TDistrict | null,
    isResearcher: row.isResearcher,
    language: row.language as TLanguage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, rawIterations, rawSalt, rawHash] = stored.split("$");
  if (prefix !== PBKDF2_PREFIX || !rawIterations || !rawSalt || !rawHash) return false;
  const iterations = Number(rawIterations);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  try {
    const actual = await derive(password, base64UrlToBytes(rawSalt), iterations);
    return timingSafeEqual(actual, base64UrlToBytes(rawHash));
  } catch {
    return false;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = bytesToBase64Url(
    encoder.encode(JSON.stringify({ sub: userId, iat: now, exp: now + JWT_TTL_SECONDS })),
  );
  const data = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyJwt(token: string, secret: string): Promise<TJwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];
  try {
    const header: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(rawHeader)));
    if (!header || typeof header !== "object" || (header as { alg?: unknown }).alg !== "HS256") {
      return null;
    }
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlToBytes(rawSignature),
      encoder.encode(`${rawHeader}.${rawPayload}`),
    );
    if (!valid) return null;
    const parsed = ZJwtPayload.safeParse(
      JSON.parse(new TextDecoder().decode(base64UrlToBytes(rawPayload))),
    );
    if (!parsed.success) return null;
    if (parsed.data.exp * 1000 <= Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

// Keep PBKDF2 cost flat for unknown emails so login timing can't reveal accounts.
export const DUMMY_PASSWORD_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function requireAuth(): MiddlewareHandler<TAuthContext> {
  return async (c, next) => {
    if (!c.env.JWT_SECRET) return c.json({ error: "unauthorized" }, 401);
    const match = /^Bearer\s+(.+)$/i.exec(c.req.header("authorization") ?? "");
    if (!match) return c.json({ error: "unauthorized" }, 401);
    const payload = await verifyJwt(match[1]!, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: "unauthorized" }, 401);
    const db = createDb(c.env.DB);
    const row = await db.select().from(users).where(eq(users.id, payload.sub)).get();
    if (!row) return c.json({ error: "unauthorized" }, 401);
    c.set("user", toPublicUser(row));
    await next();
  };
}

export async function findByEmail(email: string, db: ReturnType<typeof createDb>) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function isDuplicateEmailError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    if (current.message.includes("UNIQUE") && current.message.includes("users.email")) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
