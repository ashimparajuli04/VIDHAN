import { and, count, desc, eq, like } from "drizzle-orm";
import { DOCUMENT_STATUSES, documents } from "@vidhan/schema";
import type { TDocumentStatus } from "@vidhan/schema";

import type { Db } from "../db";

export interface DocumentListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: TDocumentStatus;
  year?: number;
}

export async function listDocuments(db: Db, query: DocumentListQuery) {
  const conditions = [];
  if (query.search) conditions.push(like(documents.title, `%${query.search}%`));
  if (query.status) conditions.push(eq(documents.status, query.status));
  if (query.year !== undefined) conditions.push(eq(documents.year, query.year));
  const where = conditions.length ? and(...conditions) : undefined;

  const offset = (query.page - 1) * query.limit;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(documents).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;
  return {
    documents: rows,
    total,
    page: query.page,
    limit: query.limit,
    pageCount: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}

export const isDocumentStatus = (value: string): value is TDocumentStatus =>
  (DOCUMENT_STATUSES as readonly string[]).includes(value);