import { Hono } from "hono";
import { and, count, eq, gt } from "drizzle-orm";

import { documentChunks, documentToc, documents } from "@vidhan/schema";
import type { TDocumentStatus } from "@vidhan/schema";

import type { Env } from "../../index";
import { createDb } from "../../db";
import {
  isDocumentStatus,
  listDocuments,
} from "../../documents/list";
import { parseIntParam } from "../../lib/validate";

export const docs = new Hono<{ Bindings: Env }>();

const DEFAULT_LIMIT = 10;
// Browse mode fetches the whole repository once and groups it
// alphabetically client-side, so the list must be able to return it all.
const MAX_LIMIT = 500;

docs.get("/", async (c) => {
  const page = parseIntParam(c.req.query("page"), 1);
  const limit = parseIntParam(c.req.query("limit"), DEFAULT_LIMIT);
  const search = c.req.query("search")?.trim() || undefined;
  const rawStatus = c.req.query("status")?.trim() || undefined;

  if (page === null || page < 1) {
    return c.json(
      { error: "validation_error", details: { page: "must be a positive integer" } },
      400,
    );
  }
  if (limit === null || limit < 1) {
    return c.json(
      { error: "validation_error", details: { limit: "must be a positive integer" } },
      400,
    );
  }
  let status: TDocumentStatus | undefined;
  if (rawStatus) {
    if (!isDocumentStatus(rawStatus)) {
      return c.json(
        { error: "validation_error", details: { status: "unknown status" } },
        400,
      );
    }
    status = rawStatus;
  }

  const rawYear = c.req.query("year");
  let year: number | undefined;
  if (rawYear !== undefined && rawYear !== "") {
    const parsed = parseIntParam(rawYear, NaN);
    if (parsed === null || Number.isNaN(parsed)) {
      return c.json(
        { error: "validation_error", details: { year: "must be a positive integer" } },
        400,
      );
    }
    year = parsed;
  }

  const db = createDb(c.env.DB);
  const result = await listDocuments(db, {
    page,
    limit: Math.min(limit, MAX_LIMIT),
    search,
    status,
    year,
  });

  return c.json({
    documents: result.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      year: doc.year,
      status: doc.status,
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
    pageCount: result.pageCount,
  });
});

// ═════════════════════════════════════════════════════════════════════════
// GET /docs/:id/content — chunked document content
//
// WHY THIS ENDPOINT EXISTS
// ------------------------
// The document metadata endpoints (GET /docs, GET /docs/:id) deliberately
// carry only id/title/year. The actual legal text of a document can be
// hundreds of kilobytes, so it lives in a separate table (`document_chunks`,
// one row per ~2000-char piece) and is served here — never whole. The web
// reader consumes this endpoint through a virtualized list, so three design
// constraints shape everything below:
//
//   1. A response must stay small and bounded (limit, capped at 50 chunks).
//   2. Pages must be resumeable statelessly — no session, no token, just a
//      chunk index cursor the client already holds.
//   3. The client must learn the document's total size up front, so its
//      virtualizer can size the scrollbar before all content is loaded.
//
// HOW THE CONTENT GOT THERE (chunking)
// ------------------------------------
// `apps/api/src/ingest/cli.ts` reads markdown files from data/, runs each
// through `chunk()` in `apps/api/src/rag/chunker.ts`, and writes
// data/content.seed.sql, which `db:seed:content:load` executes into D1.
// The chunker:
//   - targets ~2000 chars per chunk (soft ceiling, DEFAULT_MAX_LENGTH);
//   - never cuts before ~800 chars from the previous cut (minLength) so
//     chunks don't degenerate into slivers;
//   - prefers cutting at a paragraph break ("\n\n"), falling back to a
//     single newline, then a sentence end (". "), then a space — always the
//     LAST such boundary inside the window, which keeps each chunk near the
//     ceiling and preserves markdown structure (headings/list blocks) in
//     almost all cases;
//   - produces NO overlap between adjacent chunks, deliberately: the reader
//     renders chunks back-to-back as one continuous document, so any
//     duplicated text would be visible to the user. Overlap is a retrieval
//     concern (embeddings), not a display concern.
//
// Storage invariants (document_chunks table, @vidhan/schema):
//   - composite PK (document_id, chunk_index); chunk_index is contiguous
//     0..N-1 per document — `after` arithmetic below relies on that;
//   - a document with no content has ZERO rows — "null content" is the
//     absence of rows, and the client sees totalChunks: 0;
//   - today only seed-doc-001 has rows (a mock constitution, ~14 chunks);
//     every other seed document is intentionally empty.
//
// REQUEST — query params
// ----------------------
//   id        path param, document id (e.g. seed-doc-001). Unknown id → 404.
//   limit     int >= 1, chunks to return. Default 10, capped at 50.
//   after     int, cursor: the last chunk index the client already has.
//             Defaults to -1, i.e. "start from chunk 0". The page returned
//             is (after, after+limit]. `after` must be >= -1, else 400.
//
// RESPONSE — contract for the reader
// ----------------------------------
//   documentId  echo of the path param.
//   chunks      array of { index, content }, contiguous, ascending;
//               `index` is the chunk offset inside the document, NOT
//               relative to the page — the client uses it as the key and
//               the slot in the virtual list.
//   totalChunks total number of chunks in the document. Same value on every
//               page (a count query runs alongside every page query) — the
//               client sets the virtualizer's totalCount from page 1.
//   nextIndex   index the client should pass as `after` for the next page,
//               or null when this page ended the document. With `after`
//               semantics, nextIndex === last returned index + 1.
//
// HOW IT FEEDS THE WEB READER (components/documents/document-detail.tsx)
// ----------------------------------------------------------------------
//   The reader starts by fetching the first page (after = -1) together with
//   the document metadata. That single response yields totalChunks, which
//   becomes the Virtuoso `totalCount`, and the first PAGE_SIZE chunks, which
//   seed the cache. Virtuoso mounts only the rows around the viewport
//   (window scroll, like the repo list), so a document of any size renders
//   only a handful of DOM nodes at a time — that's the "no lag on long
//   files" part.
//   As the user scrolls, the reader's rangeChanged callback fires; when the
//   visible range approaches the loaded frontier (nextIndex), the reader
//   requests the next page with `after` = its last cached index. Loaded
//   chunks are cached in a Map keyed by index; not-yet-loaded slots render
//   skeleton rows so the scrollbar stays stable. Because pages are keyed by
//   a stable chunk index, fetches are idempotent and the reader can resume
//   from any cursor — there is no page-number math on the client.
//
// One wrinkle: two queries run on every page (the page itself + a count).
// The count is cheap (single indexed PK range on document_id) and it keeps
// the response self-describing, which the reader's first paint depends on.
//
// Full design: docs/document-content.md.
// ═════════════════════════════════════════════════════════════════════════
const DEFAULT_CONTENT_LIMIT = 10;
const MAX_CONTENT_LIMIT = 50;

docs.get("/:id/content", async (c) => {
  const id = c.req.param("id");
  const limit = parseIntParam(c.req.query("limit"), DEFAULT_CONTENT_LIMIT);
  const rawAfter = c.req.query("after");
  // `after` is the last chunk index already received; -1 (default) starts
  // from the first chunk.
  const after =
    rawAfter === undefined || rawAfter === ""
      ? -1
      : parseIntParam(rawAfter, NaN);

  if (limit === null || limit < 1) {
    return c.json(
      { error: "validation_error", details: { limit: "must be a positive integer" } },
      400,
    );
  }
  if (after === null || Number.isNaN(after) || after < -1) {
    return c.json(
      { error: "validation_error", details: { after: "must be an integer >= -1" } },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const [docRow] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!docRow) return c.json({ error: "not_found" }, 404);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(documentChunks)
      .where(and(eq(documentChunks.documentId, id), gt(documentChunks.chunkIndex, after)))
      .orderBy(documentChunks.chunkIndex)
      .limit(Math.min(limit, MAX_CONTENT_LIMIT)),
    db
      .select({ total: count() })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, id)),
  ]);

  const totalChunks = totalRows[0]?.total ?? 0;
  const lastIndex = rows.at(-1)?.chunkIndex;
  return c.json({
    documentId: id,
    chunks: rows.map((row) => ({ index: row.chunkIndex, content: row.content })),
    totalChunks,
    nextIndex: lastIndex !== undefined && lastIndex + 1 < totalChunks ? lastIndex + 1 : null,
  });
});

// GET /docs/:id/toc — table of contents, built at ingest time
// (ingest/cli.ts parses every markdown heading and records the chunk index
// it falls in). Served whole — a TOC is small — so the reader can render
// the jump list before any content chunk is loaded. Documents without
// content have no rows: `headings` is an empty array, not an error.
docs.get("/:id/toc", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [docRow] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!docRow) return c.json({ error: "not_found" }, 404);

  const rows = await db
    .select()
    .from(documentToc)
    .where(eq(documentToc.documentId, id))
    .orderBy(documentToc.position);

  return c.json({
    documentId: id,
    headings: rows.map((row) => ({
      text: row.text,
      level: row.level,
      chunkIndex: row.chunkIndex,
    })),
  });
});

docs.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const [row] = await db
    .select({ id: documents.id, title: documents.title, year: documents.year })
    .from(documents)
    .where(eq(documents.id, c.req.param("id")))
    .limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ document: row });
});