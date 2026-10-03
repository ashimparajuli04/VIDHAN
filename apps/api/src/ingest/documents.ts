import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TDocumentNodeType, TDocumentType } from "@vidhan/schema";

// Converts the PG dumps in data/documents-sql-inserts-test/ (one legal_documents
// row per file, node tree inlined as JSONB) into SQLite seed files. The dumps
// are parsed, never executed: `$CODEx<hex>$` dollar-quotes and `::jsonb` casts
// are PG-only. Re-run `db:seed:documents` after adding a source file.

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, "..", "..", "..", "..", "data");
const SOURCE_DIR = join(DATA_DIR, "documents-sql-inserts-test");
const SEED_OUT = join(DATA_DIR, "legal-documents.seed.sql");
const IDS_OUT = join(DATA_DIR, "documents.ids.json");
// Static export needs every /repo/[id] route at build time; the web app can't
// reach D1, so the converter commits the id list as a module.
const WEB_IDS_OUT = join(
  HERE,
  "..",
  "..",
  "..",
  "web",
  "src",
  "lib",
  "document-ids.generated.ts",
);

const DOCUMENT_TYPES: readonly string[] = ["act", "constitution", "regulation"];

const SEED_TIME = "2026-01-15T09:00:00.000Z";

// Garbage source ids (extraction fallback) → slugs from the source filename.
const ID_OVERRIDES: Record<string, string> = {
  doc_0_it7vg66_pdf: "muluki-criminal-code-2074",
  doc_0_4_nomy0tn_pdf: "muluki-criminal-procedure-code-2074",
};

interface SourceNode {
  tier?: number;
  nodeType: string;
  identifier: string;
  title: string;
  content: string | null;
  children?: SourceNode[];
}

interface SourceDocument {
  id: string;
  title: string;
  originalTitle: string | null;
  documentType: TDocumentType;
  yearBs: number | null;
  yearAd: number | null;
  totalPages: number | null;
  sourceFilename: string;
  nodes: SourceNode[];
}

interface ConvertedNode {
  id: string;
  documentId: string;
  parentId: string | null;
  depth: number;
  nodeType: TDocumentNodeType;
  identifier: string;
  title: string;
  heading: string | null;
  content: string | null;
  position: number;
  citation: string | null;
}

// ── SQL parsing ──────────────────────────────────────────────────────────────

// Positional parse of the single `INSERT ... VALUES (...)` tuple. Walks the tuple
// respecting dollar-quoted strings, so JSON payloads with commas/quotes survive.
function parseTuple(sql: string): string[] {
  const marker = "VALUES (";
  const start = sql.indexOf(marker) + marker.length;
  const fields: string[] = [];
  let i = start;

  const skipWs = () => {
    while (i < sql.length && /\s/.test(sql[i]!)) i++;
  };

  while (i < sql.length) {
    skipWs();
    if (sql[i] === ")") break;

    if (sql.startsWith("$CODEx", i)) {
      const tagEnd = sql.indexOf("$", i + 6);
      const tag = sql.slice(i, tagEnd + 1);
      const close = sql.indexOf(tag, tagEnd + 1);
      fields.push(sql.slice(tagEnd + 1, close));
      i = close + tag.length;
      if (sql.startsWith("::jsonb", i)) i += "::jsonb".length;
    } else if (sql.startsWith("NULL", i)) {
      fields.push("");
      i += 4;
    } else {
      let j = i;
      while (j < sql.length && sql[j] !== "," && sql[j] !== ")") j++;
      fields.push(sql.slice(i, j).trim());
      i = j;
    }

    skipWs();
    if (sql[i] === ",") i++;
  }
  return fields;
}

function toIntOrNull(value: string): number | null {
  if (value === "" || value === "NULL") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseSource(sql: string, file: string): SourceDocument {
  const fields = parseTuple(sql);
  const [rawId, title, originalTitle, documentType, yearBs, yearAd, totalPages, nodes, sourceFilename] =
    fields;
  if (fields.length < 9) {
    throw new Error(`${file}: expected 9 columns, parsed ${fields.length}`);
  }
  const id = ID_OVERRIDES[rawId!] ?? rawId!;
  if (!DOCUMENT_TYPES.includes(documentType!)) {
    throw new Error(`${file}: unknown document_type ${documentType}`);
  }
  return {
    id,
    title: title!,
    originalTitle: originalTitle || null,
    documentType: documentType as TDocumentType,
    yearBs: toIntOrNull(yearBs!),
    yearAd: toIntOrNull(yearAd!),
    totalPages: toIntOrNull(totalPages!),
    sourceFilename: sourceFilename!,
    nodes: JSON.parse(nodes!) as SourceNode[],
  };
}

// ── Citation ─────────────────────────────────────────────────────────────────

// Heading = title truncated at the first colon/newline. Section titles run the
// heading into the body ("Short Title and Commencement: (1) This Act..."); the
// body is in `content`, so the citation wants only the heading.
function deriveHeading(title: string, nodeType: TDocumentNodeType): string | null {
  if (nodeType === "preamble" || nodeType === "chapter" || nodeType === "section_group") {
    return null;
  }
  const cut = title.split(/[:\n]/, 1)[0]!.trim();
  return cut.length > 0 ? cut : null;
}

interface CitationPart {
  kind: TDocumentNodeType;
  identifier: string;
  heading: string | null;
}

// Label rules per node type; section_group is a container, never cited.
function labelFor(kind: TDocumentNodeType, identifier: string): string | null {
  switch (kind) {
    case "section":
      return `Section ${identifier}`;
    case "part":
      return identifier;
    case "chapter":
      return identifier;
    case "sub_section":
      return `Sub-section ${identifier}`;
    case "clause":
      return `Clause ${identifier}`;
    case "schedule":
      return identifier;
    case "preamble":
      return "Preamble";
    default:
      return null;
  }
}

// `{title}, {ancestor labels}, {own label} ({heading})` — heading only on the
// node actually being cited, and only when it adds information.
function buildCitation(documentTitle: string, chain: CitationPart[]): string | null {
  const labels: string[] = [];
  for (const part of chain) {
    if (part.kind === "section_group") continue;
    const label = labelFor(part.kind, part.identifier);
    if (label) labels.push(label);
  }
  if (labels.length === 0) return null;

  const own = chain[chain.length - 1]!;
  const heading = own.kind === "preamble" ? null : own.heading;
  const base = `${documentTitle}, ${labels.join(", ")}`;
  if (!heading) return base;

  const normalized = heading.toLowerCase();
  if (base.toLowerCase().includes(normalized)) return base;
  return `${base} (${heading})`;
}

// ── Tree walk ────────────────────────────────────────────────────────────────

function convertDocument(doc: SourceDocument): ConvertedNode[] {
  const out: ConvertedNode[] = [];

  const walk = (
    source: SourceNode[],
    parent: { id: string | null; depth: number; chain: CitationPart[] },
  ): void => {
    source.forEach((node, position) => {
      const depth = parent.depth + 1;
      const id = `${doc.id}:${[...parent.chain.map((p) => p.identifier), position].join(".")}`;
      // Path ids key off position, not identifier, so sibling id reuse (seen in
      // the Nepali dumps) can't collide. The chain below still uses identifiers
      // for human-readable citations.
      const nodeType = node.nodeType as TDocumentNodeType;
      const heading = deriveHeading(node.title ?? "", nodeType);
      const part: CitationPart = { kind: nodeType, identifier: node.identifier, heading };
      const chain = [...parent.chain, part];

      out.push({
        id,
        documentId: doc.id,
        parentId: parent.id,
        depth,
        nodeType,
        identifier: node.identifier,
        title: node.title ?? "",
        heading,
        content: node.content ?? null,
        position,
        citation: buildCitation(doc.title, chain),
      });

      if (node.children && node.children.length > 0) {
        walk(node.children, { id, depth, chain });
      }
    });
  };

  walk(doc.nodes, { id: null, depth: 0, chain: [] });
  return out;
}

// ── Emit ─────────────────────────────────────────────────────────────────────

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function qOrNull(value: string | null): string {
  return value === null ? "NULL" : q(value);
}

function emitDocuments(docs: SourceDocument[]): string {
  const lines: string[] = ["DELETE FROM document_nodes;", "DELETE FROM documents;", ""];
  const values = docs
    .map((doc) =>
      [
        q(doc.id),
        q(doc.title),
        qOrNull(doc.originalTitle),
        q(doc.documentType),
        doc.yearBs === null ? "NULL" : String(doc.yearBs),
        doc.yearAd === null ? "NULL" : String(doc.yearAd),
        doc.totalPages === null ? "NULL" : String(doc.totalPages),
        q(doc.sourceFilename),
        "NULL",
        q(SEED_TIME),
        q(SEED_TIME),
      ].join(", "),
    )
    .map((cols) => `  (${cols})`)
    .join(",\n");
  lines.push(
    "INSERT INTO documents (id, title, original_title, document_type, year_bs, year_ad, total_pages, source_filename, summary, created_at, updated_at) VALUES",
    values,
    ";",
    "",
  );
  return lines.join("\n");
}

const NODE_INSERT_COLUMNS =
  "INSERT INTO document_nodes (id, document_id, parent_id, depth, node_type, identifier, title, heading, content, position, citation, created_at) VALUES";

// D1 rejects statements past ~100KB (SQLITE_TOOBIG); single documents run 350
// nodes with multi-KB bodies. Accumulate rows until the byte budget is hit, so
// batches stay safely under the limit regardless of body size.
const NODE_INSERT_BYTE_BUDGET = 60 * 1024;

function nodeRow(node: ConvertedNode): string {
  return `  (${[
    q(node.id),
    q(node.documentId),
    qOrNull(node.parentId),
    String(node.depth),
    q(node.nodeType),
    q(node.identifier),
    q(node.title),
    qOrNull(node.heading),
    qOrNull(node.content),
    String(node.position),
    qOrNull(node.citation),
    q(SEED_TIME),
  ].join(", ")})`;
}

function emitNodes(nodes: ConvertedNode[]): string {
  if (nodes.length === 0) return "";

  const byDocument = new Map<string, ConvertedNode[]>();
  for (const node of nodes) {
    const list = byDocument.get(node.documentId) ?? [];
    list.push(node);
    byDocument.set(node.documentId, list);
  }

  const lines: string[] = [];
  for (const docNodes of byDocument.values()) {
    let batch: string[] = [];
    let bytes = 0;
    const flush = () => {
      if (batch.length === 0) return;
      lines.push(NODE_INSERT_COLUMNS, batch.join(",\n"), ";", "");
      batch = [];
      bytes = 0;
    };
    for (const node of docNodes) {
      const row = nodeRow(node);
      const rowBytes = Buffer.byteLength(row, "utf-8") + 2;
      if (bytes > 0 && bytes + rowBytes > NODE_INSERT_BYTE_BUDGET) flush();
      batch.push(row);
      bytes += rowBytes;
    }
    flush();
  }
  return lines.join("\n");
}

async function main() {
  const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    throw new Error(`no .sql files in ${SOURCE_DIR}`);
  }

  const byId = new Map<string, SourceDocument>();
  for (const file of files) {
    const sql = await readFile(join(SOURCE_DIR, file), "utf-8");
    const doc = parseSource(sql, file);
    if (byId.has(doc.id)) {
      console.log(`[ingest] ${file}: duplicate id ${doc.id}, skipping`);
      continue;
    }
    byId.set(doc.id, doc);
  }

  const docs = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const allNodes: ConvertedNode[] = [];
  for (const doc of docs) {
    const nodes = convertDocument(doc);
    allNodes.push(...nodes);
    console.log(`[ingest] ${doc.id}: ${nodes.length} nodes`);
  }

  const ids = docs.map((doc) => doc.id);
  const sql = emitDocuments(docs) + emitNodes(allNodes);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SEED_OUT, sql, "utf-8");
  await writeFile(IDS_OUT, JSON.stringify(ids, null, 2) + "\n", "utf-8");
  await writeFile(
    WEB_IDS_OUT,
    [
      "// GENERATED by apps/api/src/ingest/documents.ts — do not edit by hand.",
      "// Static export requires every /repo/[id] route at build time.",
      "export const REPO_DOCUMENT_IDS: string[] = [",
      ...ids.map((id) => `  ${JSON.stringify(id)},`),
      "];",
      "",
    ].join("\n"),
    "utf-8",
  );
  console.log(
    `[ingest] wrote ${docs.length} documents / ${allNodes.length} nodes → ${SEED_OUT}`,
  );
  console.log(`[ingest] wrote id list → ${IDS_OUT} and ${WEB_IDS_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
