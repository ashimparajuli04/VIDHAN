import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import {
  DOCUMENT_TYPES,
  documentNodes,
  documents,
  type TDocumentNodeOutline,
  type TDocumentType,
} from "@vidhan/schema";

import type { Db } from "../db";

export interface DocumentListQuery {
  page: number;
  limit: number;
  search?: string;
  type?: TDocumentType;
}

export async function listDocuments(db: Db, query: DocumentListQuery) {
  const conditions: SQL[] = [];
  if (query.search) {
    const needle = `%${query.search}%`;
    conditions.push(or(like(documents.title, needle), like(documents.summary, needle))!);
  }
  if (query.type) conditions.push(eq(documents.documentType, query.type));
  const where = conditions.length ? and(...conditions) : undefined;

  const offset = (query.page - 1) * query.limit;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        documentType: documents.documentType,
        yearBs: documents.yearBs,
        yearAd: documents.yearAd,
      })
      .from(documents)
      .where(where)
      .orderBy(asc(documents.title))
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

export const isDocumentType = (value: string): value is TDocumentType =>
  (DOCUMENT_TYPES as readonly string[]).includes(value);

export async function getDocument(db: Db, id: string) {
  const [row] = await db
    .select({
      id: documents.id,
      title: documents.title,
      documentType: documents.documentType,
      yearBs: documents.yearBs,
      yearAd: documents.yearAd,
      totalPages: documents.totalPages,
      summary: documents.summary,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return row ?? null;
}

// Assemble the flat node rows into the outline tree. Rows come pre-ordered by
// (depth, position) so a parent is always inserted before its children; a map
// by id links them without a second pass. Content is excluded — readers and the
// retrieval agent fetch bodies one node at a time.
export async function getDocumentOutline(db: Db, id: string) {
  const nodes = await db
    .select({
      id: documentNodes.id,
      documentId: documentNodes.documentId,
      parentId: documentNodes.parentId,
      depth: documentNodes.depth,
      nodeType: documentNodes.nodeType,
      identifier: documentNodes.identifier,
      title: documentNodes.title,
      heading: documentNodes.heading,
      position: documentNodes.position,
      citation: documentNodes.citation,
    })
    .from(documentNodes)
    .where(eq(documentNodes.documentId, id))
    .orderBy(asc(documentNodes.depth), asc(documentNodes.position));

  const byId = new Map<string, TDocumentNodeOutline>();
  const roots: TDocumentNodeOutline[] = [];
  for (const node of nodes) {
    const outline: TDocumentNodeOutline = { ...node, children: [] };
    byId.set(node.id, outline);
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(outline);
    else roots.push(outline);
  }
  return roots;
}

export async function getDocumentNode(db: Db, documentId: string, nodeId: string) {
  const [row] = await db
    .select()
    .from(documentNodes)
    .where(and(eq(documentNodes.id, nodeId), eq(documentNodes.documentId, documentId)))
    .limit(1);
  return row ?? null;
}

export async function listDocumentTitles(db: Db) {
  return db
    .select({ id: documents.id, title: documents.title, documentType: documents.documentType })
    .from(documents)
    .orderBy(desc(documents.yearAd), asc(documents.title));
}
