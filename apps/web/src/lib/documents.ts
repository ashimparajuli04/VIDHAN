import { ZPublicDocument } from "@vidhan/schema";
import type { TPublicDocument } from "@vidhan/schema";

import { apiGet } from "@/lib/api";

export interface DocumentQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface DocumentPage {
  documents: TPublicDocument[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

// The repository page only ever shows title + year. Status exists in the
// schema but stays out of this surface on purpose.
export type TRepoDocument = Pick<TPublicDocument, "id" | "title" | "year">;

// Browse fetches the whole repository once and groups it alphabetically
// client-side; 500 comfortably covers the seed and headroom.
const REPO_DOCUMENTS_LIMIT = 500;

export async function getDocuments(
  query: DocumentQuery = {},
): Promise<DocumentPage> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));
  if (query.search) params.set("search", query.search);

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
  return result.documents.map(({ id, title, year }) => ({ id, title, year }));
}

// Static export needs every route's params at build time, and the seed
// document ids are deterministic (seed-doc-001 … seed-doc-200). Swap this
// for the real id source when the API becomes the source of truth.
export const REPO_DOCUMENT_IDS: string[] = Array.from(
  { length: 200 },
  (_, index) => `seed-doc-${String(index + 1).padStart(3, "0")}`,
);