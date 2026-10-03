import { and, desc, eq } from "drizzle-orm";
import {
  lawyerRequests,
  lawyers as lawyersTable,
  users as usersTable,
} from "@vidhan/schema";
import type {
  TAdminLawyerRequest,
  TLawyerRequestCreate,
  TPublicLawyerRequest,
  TRequestStatus,
} from "@vidhan/schema";
import type { Db } from "../db";

// Requests may only target a lawyer the public surface can show, so the
// active/verified gate mirrors the catalogue query.
export async function createLawyerRequest(
  db: Db,
  userId: string,
  input: TLawyerRequestCreate,
): Promise<TPublicLawyerRequest | null> {
  const lawyer = await db
    .select({ id: lawyersTable.id, name: lawyersTable.name })
    .from(lawyersTable)
    .where(
      and(
        eq(lawyersTable.id, input.lawyerId),
        eq(lawyersTable.active, true),
        eq(lawyersTable.verified, true),
      ),
    )
    .get();
  if (!lawyer) return null;

  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    lawyerId: lawyer.id,
    userId,
    phone: input.phone,
    preferredTime: input.preferredTime,
    mode: input.mode ?? null,
    note: input.note ?? null,
    status: "pending" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(lawyerRequests).values(row);
  return {
    id: row.id,
    lawyerId: row.lawyerId,
    lawyerName: lawyer.name,
    preferredTime: row.preferredTime,
    mode: row.mode,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function listOwnRequests(
  db: Db,
  userId: string,
): Promise<TPublicLawyerRequest[]> {
  return db
    .select({
      id: lawyerRequests.id,
      lawyerId: lawyerRequests.lawyerId,
      lawyerName: lawyersTable.name,
      preferredTime: lawyerRequests.preferredTime,
      mode: lawyerRequests.mode,
      note: lawyerRequests.note,
      status: lawyerRequests.status,
      createdAt: lawyerRequests.createdAt,
    })
    .from(lawyerRequests)
    .innerJoin(lawyersTable, eq(lawyerRequests.lawyerId, lawyersTable.id))
    .where(eq(lawyerRequests.userId, userId))
    .orderBy(desc(lawyerRequests.createdAt));
}

const adminSelection = {
  id: lawyerRequests.id,
  lawyerId: lawyerRequests.lawyerId,
  lawyerName: lawyersTable.name,
  userId: lawyerRequests.userId,
  userName: usersTable.name,
  userEmail: usersTable.email,
  phone: lawyerRequests.phone,
  preferredTime: lawyerRequests.preferredTime,
  mode: lawyerRequests.mode,
  note: lawyerRequests.note,
  status: lawyerRequests.status,
  createdAt: lawyerRequests.createdAt,
  updatedAt: lawyerRequests.updatedAt,
};

export async function listAllRequests(db: Db): Promise<TAdminLawyerRequest[]> {
  return db
    .select(adminSelection)
    .from(lawyerRequests)
    .innerJoin(lawyersTable, eq(lawyerRequests.lawyerId, lawyersTable.id))
    .innerJoin(usersTable, eq(lawyerRequests.userId, usersTable.id))
    .orderBy(desc(lawyerRequests.createdAt));
}

export async function updateRequestStatus(
  db: Db,
  id: string,
  status: TRequestStatus,
): Promise<TAdminLawyerRequest | null> {
  const existing = await db
    .select({ id: lawyerRequests.id })
    .from(lawyerRequests)
    .where(eq(lawyerRequests.id, id))
    .get();
  if (!existing) return null;

  await db
    .update(lawyerRequests)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(lawyerRequests.id, id));

  const row = await db
    .select(adminSelection)
    .from(lawyerRequests)
    .innerJoin(lawyersTable, eq(lawyerRequests.lawyerId, lawyersTable.id))
    .innerJoin(usersTable, eq(lawyerRequests.userId, usersTable.id))
    .where(eq(lawyerRequests.id, id))
    .get();
  return row ?? null;
}
