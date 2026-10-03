import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isDocumentContentNode } from "@vidhan/schema";

import { embedTexts, normalize, toBlob } from "../ai/embeddings";
import type { Env } from "../index";
import { API_ROOT, readApiKey, readEmbeddingConfig, runD1Json } from "./d1";

// Generates section-level embeddings for the hybrid chat retrieval path, the
// same way ingest/summaries.ts generates the document briefs. Reads the local
// D1 as JSON, embeds every citable node's heading + body, and emits an
// INSERT seed file. Run:
//   pnpm --filter @vidhan/api db:seed:embeddings
//   pnpm --filter @vidhan/api db:seed:embeddings:load   (loads into local D1)
// Must run after db:seed:documents:load, because reseeding documents cascades
// the embeddings away. Idempotent via content_hash + model: unchanged nodes are
// skipped, so a re-run only embeds what changed.

const OUT = resolve(API_ROOT, "..", "..", "data", "document-embeddings.seed.sql");

// bge-m3 context is 8194 tokens; ~4 chars/token leaves headroom, and section
// bodies are far under this except for a few long schedules.
const MAX_INPUT_CHARS = 6000;

interface NodeRow {
  id: string;
  heading: string | null;
  title: string;
  content: string | null;
  node_type: string;
}

interface ExistingRow {
  node_id: string;
  model: string;
  content_hash: string;
}

// Bodies are in Devanagari, where each glyph is 3 UTF-8 bytes, so the SQL text
// must be counted by bytes not characters to stay under D1's statement cap.
const INSERT_COLUMNS =
  "INSERT INTO document_node_embeddings (node_id, model, dims, vector, content_hash, updated_at) VALUES";

function textFor(node: NodeRow): string {
  const label = node.heading?.trim() || node.title;
  const body = node.content ?? "";
  return `${label}\n${body}`.slice(0, MAX_INPUT_CHARS);
}

function contentHash(text: string, model: string): string {
  return createHash("sha256").update(`${model}\n${text}`).digest("hex");
}

export function vectorLiteral(vector: number[]): string {
  const bytes = toBlob(vector);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return `X'${hex}'`;
}

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function row(nodeId: string, model: string, dims: number, vector: number[], hash: string): string {
  return `  (${[
    q(nodeId),
    q(model),
    String(dims),
    vectorLiteral(vector),
    q(hash),
    q(new Date().toISOString()),
  ].join(", ")})`;
}

// The list of sections that need embedding: every citable node whose stored
// (model, content_hash) differs from what is on disk. Container nodes have no
// body and are not citable, so they are skipped.
async function pendingNodes(model: string): Promise<{ node: NodeRow; text: string; hash: string }[]> {
  const nodes = runD1Json<NodeRow>(
    "SELECT id, heading, title, content, node_type FROM document_nodes ORDER BY document_id, position;",
  );
  const existing = runD1Json<ExistingRow>(
    `SELECT node_id, model, content_hash FROM document_node_embeddings WHERE model = ${q(model)};`,
  );
  const byNode = new Map(existing.map((row) => [row.node_id, row.content_hash]));

  const out: { node: NodeRow; text: string; hash: string }[] = [];
  for (const node of nodes) {
    if (!isDocumentContentNode(node.node_type)) continue;
    const text = textFor(node);
    if (text.trim().length === 0) continue;
    const hash = contentHash(text, model);
    if (byNode.get(node.id) === hash) continue;
    out.push({ node, text, hash });
  }
  return out;
}

async function main() {
  const apiKey = readApiKey();
  const { model, dims } = readEmbeddingConfig();
  const env = {
    OPENROUTER_API_KEY: apiKey,
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    EMBEDDING_MODEL: model,
    EMBEDDING_DIMS: String(dims),
  } as Env;

  const pending = await pendingNodes(model);
  console.log(`[embeddings] ${pending.length} nodes need embedding (model ${model})`);
  if (pending.length === 0) {
    writeFileSync(OUT, "", "utf-8");
    console.log(`[embeddings] nothing to do → ${OUT}`);
    return;
  }

  const updates: string[] = [];
  // Single-row inserts: a 1024-dim vector is ~2 KB of hex plus the base text,
  // and D1 rejects statements past ~100 KB, so batching many rows risks
  // SQLITE_TOOBIG. One INSERT per row stays well under the cap.
  const BATCH = 16;
  for (let start = 0; start < pending.length; start += BATCH) {
    const slice = pending.slice(start, start + BATCH);
    const embeddings = await embedTexts(
      env,
      slice.map((item) => item.text),
    );
    slice.forEach((item, index) => {
      const raw = embeddings[index];
      if (!raw) throw new Error(`no_embedding for ${item.node.id}`);
      if (raw.length !== dims) {
        throw new Error(
          `dim mismatch for ${item.node.id}: got ${raw.length}, expected ${dims} (EMBEDDING_DIMS)`,
        );
      }
      updates.push(
        `${INSERT_COLUMNS}\n${row(item.node.id, model, dims, normalize(raw), item.hash)};`,
        "",
      );
    });
    writeFileSync(OUT, updates.join("\n"), "utf-8");
    console.log(`[embeddings] ${Math.min(start + BATCH, pending.length)}/${pending.length}`);
  }

  console.log(`[embeddings] wrote ${updates.length / 2} vectors → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
