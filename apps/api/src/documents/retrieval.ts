import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { documentNodes, documents } from "@vidhan/schema";
import type { TDocumentNodeType, TReference } from "@vidhan/schema";

import type { Db } from "../db";

// Retrieval reads for the chat agent, kept separate from `documents/list.ts`
// (which backs the reader's public outline). These favour small, filtered
// payloads over completeness: a 349-section code must not land whole in the
// model context.

export const DEFAULT_OUTLINE_LIMIT = 40;
export const DEFAULT_SECTION_MAX_CHARS = 6000;

export type TOutlineEntry = {
  id: string;
  identifier: string;
  heading: string;
  chapter: string | null;
};

export type TOutlinePage = {
  documentId: string;
  title: string;
  total: number;
  returned: number;
  truncated: boolean;
  hint?: string;
  sections: TOutlineEntry[];
};

export type TSectionText = {
  documentId: string;
  documentTitle: string;
  nodeId: string;
  identifier: string;
  heading: string | null;
  content: string;
  contentLength: number;
  truncated: boolean;
  citation: string | null;
};

// Flat (document_id, position)-ordered rows. Depth is 2 in this corpus
// (containers at depth 1, sections at depth 2), so chapters are resolved by
// walking back to the nearest preceding container — no recursion needed.
async function loadFlatNodes(db: Db, documentId: string) {
  return db
    .select({
      id: documentNodes.id,
      parentId: documentNodes.parentId,
      nodeType: documentNodes.nodeType,
      identifier: documentNodes.identifier,
      title: documentNodes.title,
      heading: documentNodes.heading,
      position: documentNodes.position,
    })
    .from(documentNodes)
    .where(eq(documentNodes.documentId, documentId))
    .orderBy(asc(documentNodes.position));
}

function chapterLabel(row: {
  identifier: string;
  heading: string | null;
  title: string;
}): string {
  const label = row.heading ?? row.title;
  return row.identifier ? `${row.identifier} · ${label}` : label;
}

// Sections only, with the minimal fields needed to choose one. `query` filters
// by heading; without it the list is capped so large documents stay bounded.
export async function getCompactOutline(
  db: Db,
  documentId: string,
  options: { query?: string; limit?: number } = {},
): Promise<TOutlinePage | null> {
  const [document] = await db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!document) return null;

  const rows = await loadFlatNodes(db, documentId);
  const limit = options.limit ?? DEFAULT_OUTLINE_LIMIT;
  const needle = options.query?.trim().toLowerCase();

  const sections: TOutlineEntry[] = [];
  let chapter: string | null = null;
  for (const row of rows) {
    if (row.nodeType === "chapter" || row.nodeType === "section_group") {
      chapter = chapterLabel(row);
      continue;
    }
    if (row.nodeType !== "section") continue;
    const heading = row.heading ?? row.title;
    if (needle && !heading.toLowerCase().includes(needle)) continue;
    sections.push({
      id: row.id,
      identifier: row.identifier,
      heading,
      chapter,
    });
  }

  const total = sections.length;
  const page = sections.slice(0, limit);
  return {
    documentId: document.id,
    title: document.title,
    total,
    returned: page.length,
    truncated: total > page.length,
    hint: needle
      ? undefined
      : "Pass query to filter sections by heading, or use search_document_sections to rank them.",
    sections: page,
  };
}

// One node's body, bounded to `maxChars`. The caller uses `truncated` +
// `contentLength` to decide whether to fetch the remainder.
export async function getBoundedSection(
  db: Db,
  documentId: string,
  nodeId: string,
  maxChars = DEFAULT_SECTION_MAX_CHARS,
): Promise<TSectionText | null> {
  const doc = await db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc[0]) return null;

  const [node] = await db
    .select({
      id: documentNodes.id,
      identifier: documentNodes.identifier,
      heading: documentNodes.heading,
      title: documentNodes.title,
      content: documentNodes.content,
      citation: documentNodes.citation,
    })
    .from(documentNodes)
    .where(
      and(eq(documentNodes.id, nodeId), eq(documentNodes.documentId, documentId)),
    )
    .limit(1);
  if (!node) return null;

  const content = node.content ?? "";
  return {
    documentId: documentId,
    documentTitle: doc[0].title,
    nodeId: node.id,
    identifier: node.identifier,
    heading: node.heading ?? node.title,
    content: content.slice(0, maxChars),
    contentLength: content.length,
    truncated: content.length > maxChars,
    citation: node.citation,
  };
}

// Resolve `cite`d node ids to display refs. Ids the model invented are dropped,
// duplicates collapse to their first cite position, and the input order is kept
// so the chip row mirrors the order the model relied on the provisions.
export async function resolveReferences(
  db: Db,
  nodeIds: string[],
): Promise<TReference[]> {
  const unique = [...new Set(nodeIds)];
  if (unique.length === 0) return [];

  const rows = await db
    .select({
      documentId: documentNodes.documentId,
      nodeId: documentNodes.id,
      identifier: documentNodes.identifier,
      heading: documentNodes.heading,
      title: documentNodes.title,
      citation: documentNodes.citation,
    })
    .from(documentNodes)
    .where(inArray(documentNodes.id, unique));

  const byId = new Map(rows.map((row) => [row.nodeId, row]));
  return unique.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        documentId: row.documentId,
        nodeId: row.nodeId,
        identifier: row.identifier,
        heading: row.heading ?? row.title,
        citation: row.citation,
      },
    ];
  });
}

export type TSectionMatch = {
  documentId: string;
  documentTitle: string;
  nodeId: string;
  identifier: string;
  heading: string;
  snippet: string;
};

// Keyword search over section headings and bodies using FTS5. Results are
// ranked (bm25) and joined back to node metadata for citation + display.
export async function searchDocumentSections(
  db: Db,
  query: string,
  limit = 8,
): Promise<TSectionMatch[]> {
  const match = toFtsQuery(query);
  if (!match) return [];

  const rows = await db.all<{
    id: string;
    document_id: string;
    title: string;
    identifier: string;
    heading: string | null;
    node_title: string;
    snippet: string;
  }>(sql`
    SELECT n.id AS id,
           n.document_id AS document_id,
           d.title AS title,
           n.identifier AS identifier,
           n.heading AS heading,
           n.title AS node_title,
           snippet(document_nodes_fts, 2, '', '', ' … ', 16) AS snippet
    FROM document_nodes_fts
    JOIN document_nodes n ON n.rowid = document_nodes_fts.rowid
    JOIN documents d ON d.id = n.document_id
    WHERE document_nodes_fts MATCH ${match}
      ORDER BY bm25(document_nodes_fts, 6.0, 6.0, 1.0)
      LIMIT ${limit}
  `);

  return rows.map((row) => ({
    documentId: row.document_id,
    documentTitle: row.title,
    nodeId: row.id,
    identifier: row.identifier,
    heading: row.heading ?? row.node_title,
    snippet: row.snippet,
  }));
}

// FTS5 matching is boolean, not substring. Drop stopwords so they don't dilute
// bm25, and quote each token so punctuation in legal text ("4.", "2066") can't
// be read as operators. Heading matches are weighted above body matches.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "has", "had", "have", "can",
  "could", "would", "should", "not", "you", "your", "with", "this", "that",
  "what", "when", "where", "which", "who", "how", "why", "from", "into",
  "about", "under", "over", "after", "before", "does", "did", "doing", "been",
  "being", "his", "her", "its", "our", "their", "them", "they", "she", "him",
  "get", "got", "any", "all", "out", "off", "但", "मा", "को", "का", "हो",
]);

function toFtsQuery(input: string): string {
  const tokens = input
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097F]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
  if (tokens.length === 0) return "";
  return tokens.map((token) => `"${token}"`).join(" OR ");
}
