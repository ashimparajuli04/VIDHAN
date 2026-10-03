import { Hono } from "hono";

import type { TDocumentType } from "@vidhan/schema";

import type { Env } from "../../index";
import { createDb } from "../../db";
import {
  getDocument,
  getDocumentNode,
  getDocumentOutline,
  isDocumentType,
  listDocuments,
} from "../../documents/list";
import { parseIntParam } from "../../lib/validate";

export const docs = new Hono<{ Bindings: Env }>();

const DEFAULT_LIMIT = 10;
// Browse mode fetches the whole repository once and groups it client-side.
const MAX_LIMIT = 500;

docs.get("/", async (c) => {
  const page = parseIntParam(c.req.query("page"), 1);
  const limit = parseIntParam(c.req.query("limit"), DEFAULT_LIMIT);
  const search = c.req.query("search")?.trim() || undefined;
  const rawType = c.req.query("type")?.trim() || undefined;

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
  let type: TDocumentType | undefined;
  if (rawType) {
    if (!isDocumentType(rawType)) {
      return c.json(
        { error: "validation_error", details: { type: "unknown document type" } },
        400,
      );
    }
    type = rawType;
  }

  const db = createDb(c.env.DB);
  const result = await listDocuments(db, {
    page,
    limit: Math.min(limit, MAX_LIMIT),
    search,
    type,
  });

  return c.json({
    documents: result.documents,
    total: result.total,
    page: result.page,
    limit: result.limit,
    pageCount: result.pageCount,
  });
});

docs.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const document = await getDocument(db, c.req.param("id"));
  if (!document) return c.json({ error: "not_found" }, 404);
  return c.json({ document });
});

// Outline = the node tree without content. Serves the reader's TOC and lets the
// retrieval agent pick a section before fetching its body.
docs.get("/:id/outline", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const document = await getDocument(db, id);
  if (!document) return c.json({ error: "not_found" }, 404);
  const nodes = await getDocumentOutline(db, id);
  return c.json({ documentId: id, title: document.title, nodes });
});

// A single node's body + precomputed citation. Ids embed the document id
// (`{documentId}:{path}`), but the documentId is still checked so a node can't
// be read through another document's route. The full row is returned so the
// client can validate against ZDocumentNode rather than an ad-hoc subset.
docs.get("/:id/nodes/:nodeId", async (c) => {
  const db = createDb(c.env.DB);
  const node = await getDocumentNode(db, c.req.param("id"), c.req.param("nodeId"));
  if (!node) return c.json({ error: "not_found" }, 404);
  return c.json({ node });
});
