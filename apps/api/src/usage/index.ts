import { and, eq, sql } from "drizzle-orm";
import {
  enterpriseMembers,
  enterpriseOrganizations,
  USAGE_LIMITS,
  users,
  userUsage,
} from "@vidhan/schema";
import type { TUsage } from "@vidhan/schema";
import type { Db } from "../db";

// Nepal has no DST, so a fixed shift maps any instant to NPT wall-clock time.
const NPT_OFFSET_MINUTES = 5 * 60 + 45;
const MINUTE_MS = 60_000;

export function nptDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + NPT_OFFSET_MINUTES * MINUTE_MS);
  return shifted.toISOString().slice(0, 10);
}

export function nptResetAt(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + NPT_OFFSET_MINUTES * MINUTE_MS);
  const nextMidnightNpt = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
  );
  return new Date(nextMidnightNpt - NPT_OFFSET_MINUTES * MINUTE_MS).toISOString();
}

export function limitFor(isSubscribed: boolean): number {
  return isSubscribed ? USAGE_LIMITS.subscribed : USAGE_LIMITS.free;
}

export async function getUsage(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<TUsage> {
  const [userRow, usageRow, enterpriseRow] = await Promise.all([
    db
      .select({ isSubscribed: users.isSubscribed })
      .from(users)
      .where(eq(users.id, userId))
      .get(),
    db
      .select()
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), eq(userUsage.date, nptDate(now))))
      .get(),
    db
      .select({ tokensPerMember: enterpriseOrganizations.tokensPerMember })
      .from(enterpriseMembers)
      .innerJoin(
        enterpriseOrganizations,
        eq(enterpriseMembers.organizationId, enterpriseOrganizations.id),
      )
      .where(
        and(
          eq(enterpriseMembers.userId, userId),
          eq(enterpriseMembers.status, "active"),
          eq(enterpriseOrganizations.status, "active"),
        ),
      )
      .get(),
  ]);
  const isSubscribed = userRow?.isSubscribed ?? false;
  // An active Enterprise seat overrides the individual plans: every member
  // meters against the organization's approved per-member allocation.
  const limit = enterpriseRow
    ? enterpriseRow.tokensPerMember
    : limitFor(isSubscribed);
  return {
    used: usageRow?.tokens ?? 0,
    limit,
    resetAt: nptResetAt(now),
    isSubscribed,
  };
}

export async function addUsage(
  db: Db,
  userId: string,
  tokens: number,
  now: Date = new Date(),
): Promise<void> {
  if (tokens <= 0) return;
  await db
    .insert(userUsage)
    .values({ userId, date: nptDate(now), tokens })
    .onConflictDoUpdate({
      target: [userUsage.userId, userUsage.date],
      set: { tokens: sql`${userUsage.tokens} + ${tokens}` },
    });
}

export function isOverLimit(usage: Pick<TUsage, "used" | "limit">): boolean {
  return usage.used >= usage.limit;
}
