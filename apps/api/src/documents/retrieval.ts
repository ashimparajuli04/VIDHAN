import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { documentNodes, documents, isDocumentContentNode, nodeLabel } from "@vidhan/schema";
import type { TDocumentNodeType, TReference } from "@vidhan/schema";

import type { Db } from "../db";
import type { Env } from "../index";
import { embedQuery } from "../ai/embeddings";
import { cosineTopK, loadVectors } from "../rag/vectors";
import { rrfFuse } from "../rag/rrf";

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
  const label = nodeLabel(row);
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
    if (!isDocumentContentNode(row.nodeType)) {
      chapter = chapterLabel(row);
      continue;
    }
    // `clause` children carry text too, but they are subordinate to their rule
    // or section; the parent is the citable unit, so keep only top-level
    // content nodes here.
    if (row.parentId !== null && rows.some((r) => r.id === row.parentId && isDocumentContentNode(r.nodeType))) {
      continue;
    }
    const heading = nodeLabel(row);
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

// Summary + a flat index of the document's leaf sections, so the model can
// judge relevance from the stored brief and then fetch exact sections by id.
// The stored summary is generated offline (see ingest/summaries.ts) and is the
// terse lead line plus the parts brief.
export type TDocumentSummary = {
  documentId: string;
  title: string;
  summary: string | null;
  /** Total leaf sections; `sections` may be a bounded slice of this. */
  sectionCount: number;
  /** Bounded id+heading index. For large documents the model should narrow with
   * search_document_sections rather than read this list alone. */
  sections: { nodeId: string; label: string }[];
  truncated: boolean;
};

// A 300-section code would otherwise dump ~12k tokens of ids per turn. Cap the
// index and let the model search within the document when it is larger.
const SUMMARY_SECTION_LIMIT = 80;

export async function getDocumentSummary(
  db: Db,
  documentId: string,
): Promise<TDocumentSummary | null> {
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      summary: documents.summary,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return null;

  const rows = await db
    .select({
      id: documentNodes.id,
      identifier: documentNodes.identifier,
      title: documentNodes.title,
      heading: documentNodes.heading,
      nodeType: documentNodes.nodeType,
      position: documentNodes.position,
    })
    .from(documentNodes)
    .where(eq(documentNodes.documentId, documentId))
    .orderBy(asc(documentNodes.position));

  // Every content node carries citable text; containers are skipped because
  // their content is covered by the brief.
  const all = rows
    .filter((row) => isDocumentContentNode(row.nodeType))
    .map((row) => ({
      nodeId: row.id,
      label: `${row.identifier ? `${row.identifier}. ` : ""}${nodeLabel(row)}`.trim(),
    }));

  return {
    documentId: doc.id,
    title: doc.title,
    summary: doc.summary,
    sectionCount: all.length,
    sections: all.slice(0, SUMMARY_SECTION_LIMIT),
    truncated: all.length > SUMMARY_SECTION_LIMIT,
  };
}

// Batch fetch: several sections in one round trip, so the model reads a handful
// of candidate provisions without one tool call each.
export async function getSections(
  db: Db,
  documentId: string,
  nodeIds: string[],
  maxChars = DEFAULT_SECTION_MAX_CHARS,
): Promise<TSectionText[]> {
  const unique = [...new Set(nodeIds)];
  if (unique.length === 0) return [];

  const [doc] = await db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return [];

  const rows = await db
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
      and(eq(documentNodes.documentId, documentId), inArray(documentNodes.id, unique)),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return unique.flatMap((id) => {
    const node = byId.get(id);
    if (!node) return [];
    const content = node.content ?? "";
    return [
      {
        documentId,
        documentTitle: doc.title,
        nodeId: node.id,
        identifier: node.identifier,
        heading: nodeLabel(node) || null,
        content: content.slice(0, maxChars),
        contentLength: content.length,
        truncated: content.length > maxChars,
        citation: node.citation,
      },
    ];
  });
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
    heading: nodeLabel(node) || null,
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
        heading: nodeLabel(row),
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
    heading: nodeLabel({ heading: row.heading, title: row.node_title, identifier: row.identifier }),
    snippet: row.snippet,
  }));
}

// Hybrid retrieval: FTS keeps exact-term precision (section numbers, act
// names, Devanagari tokens) while the vector pass adds meaning for paraphrase
// and cross-lingual questions. Fused with reciprocal-rank fusion so neither
// list's raw scores need calibrating.
//
// Any vector-path failure degrades to FTS-only: the turn must never fail
// because an embedding call or a missing seed did.
export async function hybridSearchSections(
  db: Db,
  env: Env,
  query: string,
  limit = 8,
): Promise<TSectionMatch[]> {
  const fts = await searchDocumentSections(db, query, limit);
  const model = env.EMBEDDING_MODEL;

  let vectors: { nodeId: string; score: number }[] = [];
  try {
    const embedding = await embedQuery(env, query);
    const loaded = await loadVectors(db, model);
    vectors = cosineTopK(loaded, Float32Array.from(embedding), limit);
  } catch (err) {
    console.error("[hybrid] vector pass failed, FTS only", err);
  }

  const ftsById = new Map(fts.map((match) => [match.nodeId, match]));
  const fused = rrfFuse(
    [fts.map((match) => match.nodeId), vectors.map((vector) => vector.nodeId)],
    (nodeId) => nodeId,
    limit,
  );

  // Only vector-only hits need a metadata fetch; FTS hits already carry it.
  const missing = fused.filter((nodeId) => !ftsById.has(nodeId));
  const meta = missing.length > 0 ? await loadSectionMetadata(db, missing) : new Map();

  const merged = new Map([...ftsById, ...meta]);
  return fused.flatMap((nodeId) => {
    const match = merged.get(nodeId);
    return match ? [match] : [];
  });
}

// Metadata + a body snippet for node ids the FTS pass did not return. Mirrors
// the column shape `searchDocumentSections` produces.
async function loadSectionMetadata(
  db: Db,
  nodeIds: string[],
): Promise<Map<string, TSectionMatch>> {
  const rows = await db
    .select({
      nodeId: documentNodes.id,
      documentId: documentNodes.documentId,
      documentTitle: documents.title,
      identifier: documentNodes.identifier,
      heading: documentNodes.heading,
      title: documentNodes.title,
      content: documentNodes.content,
    })
    .from(documentNodes)
    .innerJoin(documents, eq(documents.id, documentNodes.documentId))
    .where(inArray(documentNodes.id, nodeIds));

  const out = new Map<string, TSectionMatch>();
  for (const row of rows) {
    out.set(row.nodeId, {
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      nodeId: row.nodeId,
      identifier: row.identifier,
      heading: nodeLabel({ heading: row.heading, title: row.title, identifier: row.identifier }),
      snippet: (row.content ?? "").slice(0, 240),
    });
  }
  return out;
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
