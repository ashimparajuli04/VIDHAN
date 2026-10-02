import { Hono } from "hono";
import { eq } from "drizzle-orm";

import { documents } from "@vidhan/schema";
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