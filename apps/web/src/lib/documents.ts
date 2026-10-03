import {
  ZDocumentOutline,
  ZPublicDocument,
  ZPublicDocumentDetail,
} from "@vidhan/schema";
import type {
  TDocumentNode,
  TDocumentOutline,
  TDocumentType,
  TPublicDocument,
  TPublicDocumentDetail,
} from "@vidhan/schema";

import { apiGet } from "@/lib/api";

export interface DocumentQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: TDocumentType;
}

export interface DocumentPage {
  documents: TPublicDocument[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

// The repository list shows title + year + type only; summary and timestamps
// stay out of this surface on purpose.
export type TRepoDocument = Pick<
  TPublicDocument,
  "id" | "title" | "documentType" | "yearBs" | "yearAd"
>;

// Browse fetches the whole repository once and groups it alphabetically
// client-side; 500 comfortably covers the corpus and headroom.
const REPO_DOCUMENTS_LIMIT = 500;

export async function getDocuments(
  query: DocumentQuery = {},
): Promise<DocumentPage> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));
  if (query.search) params.set("search", query.search);
  if (query.type) params.set("type", query.type);

  const payload = (await apiGet(`/docs?${params}`)) as {
    documents?: unknown;
    total?: unknown;
    page?: unknown;
    limit?: unknown;
    pageCount?: unknown;
  };
  if (!Array.isArray(payload.documents)) throw new Error("invalid_response");
  const documents = payload.documents.map((item) => ZPublicDocument.parse(item));

  return {
    documents,
    total: Number(payload.total),
    page: Number(payload.page),
    limit: Number(payload.limit),
    pageCount: Number(payload.pageCount),
  };
}

export async function getRepositoryDocuments(): Promise<TRepoDocument[]> {
  const result = await getDocuments({ limit: REPO_DOCUMENTS_LIMIT });
  return result.documents.map(({ id, title, documentType, yearBs, yearAd }) => ({
    id,
    title,
    documentType,
    yearBs,
    yearAd,
  }));
}

export async function getDocument(
  id: string,
): Promise<TPublicDocumentDetail | null> {
  const payload = (await apiGet(`/docs/${encodeURIComponent(id)}`)) as {
    document?: unknown;
  };
  if (!payload.document) return null;
  return ZPublicDocumentDetail.parse(payload.document);
}

// The outline is the node tree without body text — the reader renders its TOC
// from it and lazily fetches section content by node id as the user scrolls.
export async function getDocumentOutline(id: string): Promise<TDocumentOutline> {
  const payload = (await apiGet(
    `/docs/${encodeURIComponent(id)}/outline`,
  )) as unknown;
  return ZDocumentOutline.parse(payload);
}

export async function getDocumentNode(
  id: string,
  nodeId: string,
): Promise<TDocumentNode | null> {
  const payload = (await apiGet(
    `/docs/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeId)}`,
  )) as { node?: unknown };
  if (!payload.node) return null;
  return payload.node as TDocumentNode;
}
