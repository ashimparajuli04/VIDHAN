import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { API_ROOT, readApiKey, runD1Json } from "../ingest/d1";
import {
  applyEdits,
  requestEdits,
  verifyContent,
  type TContentNode,
  type TEdit,
  type TEditFailure,
} from "./llm";
import { conservationKey, isContentNode, normalizeNode } from "./normalize";

// Cleans `document_nodes` after ingest and emits a versioned UPDATE artifact.
// Mirrors ingest/summaries.ts: read local D1 as JSON, clean, write
// `data/documents.cleaned.seed.sql` plus a report. The LLM runs once here;
// loading never calls it. Run:
//   pnpm --filter @vidhan/api db:clean:documents
//   pnpm --filter @vidhan/api db:clean:documents:load
// Pass --no-llm to run only the deterministic layer (dev / idempotency checks).

const DATA_DIR = resolve(API_ROOT, "..", "..", "data");
const OUT = resolve(DATA_DIR, "documents.cleaned.seed.sql");
const REPORT_OUT = resolve(DATA_DIR, "documents.cleaned.report.json");
const SKIP_LLM = process.argv.includes("--no-llm");

interface TNodeRow {
  id: string;
  document_id: string;
  node_type: string;
  identifier: string;
  title: string;
  heading: string | null;
  content: string | null;
  position: number;
}

interface TDocumentRow {
  id: string;
  title: string;
}

interface TPreparedNode {
  row: TNodeRow;
  title: string;
  heading: string | null;
  content: string | null;
  folded: boolean;
  artifactsRemoved: number;
  llmApplied: number;
  /** Set when the deterministic layer is unsafe for this node; it is skipped. */
  revertReason: string | null;
}

interface TNodeChange {
  id: string;
  nodeType: string;
  folded: boolean;
  artifactsRemoved: number;
  titleChanged: boolean;
  contentChanged: boolean;
  llmApplied: number;
}

interface TDocumentReport {
  id: string;
  title: string;
  nodeCount: number;
  changed: TNodeChange[];
  llmRejected: { nodeId: string; edit: TEdit; reason: string }[];
  llmFailures: TEditFailure[];
  reverted: { nodeId: string; reason: string }[];
}

interface TReport {
  generatedAt: string;
  llm: boolean;
  totals: {
    documents: number;
    nodes: number;
    changed: number;
    folded: number;
    artifactsRemoved: number;
    llmApplied: number;
    llmRejected: number;
    llmFailures: number;
    reverted: number;
  };
  documents: TDocumentReport[];
}

function prepareNode(row: TNodeRow, documentTitle: string): TPreparedNode {
  const det = normalizeNode({
    nodeType: row.node_type,
    title: row.title,
    heading: row.heading,
    content: row.content,
    documentTitle,
  });

  const base = {
    row,
    title: det.title,
    heading: det.heading,
    content: det.content,
    folded: det.folded,
    artifactsRemoved: det.artifactsRemoved,
    llmApplied: 0,
  };

  // Citations are keyed off `heading` (and every ancestor's), so an unchanged
  // heading proves every citation is unchanged; a change means skip the node.
  if (det.heading !== row.heading) {
    return { ...base, revertReason: "heading_changed" };
  }
  const rawKey = conservationKey(row.title, row.content, documentTitle);
  const detKey = conservationKey(det.title, det.content, documentTitle);
  if (rawKey !== detKey) {
    return { ...base, revertReason: "deterministic_text_loss" };
  }
  return { ...base, revertReason: null };
}

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function qOrNull(value: string | null): string {
  return value === null ? "NULL" : q(value);
}

// `heading` never changes (asserted in prepareNode), so only title/content are
// written. FTS refreshes via the table's UPDATE trigger.
function emitUpdate(node: TPreparedNode): string {
  const sets: string[] = [];
  if (node.title !== node.row.title) sets.push(`title = ${q(node.title)}`);
  if (node.content !== node.row.content) {
    sets.push(`content = ${qOrNull(node.content)}`);
  }
  return `UPDATE document_nodes SET ${sets.join(", ")} WHERE id = ${q(node.row.id)};`;
}

function collectContentNodes(prepared: TPreparedNode[]): TContentNode[] {
  const out: TContentNode[] = [];
  for (const node of prepared) {
    if (node.revertReason) continue;
    if (!isContentNode(node.row.node_type)) continue;
    if (node.content === null || node.content.length === 0) continue;
    out.push({ id: node.row.id, content: node.content });
  }
  return out;
}

async function cleanDocument(
  doc: TDocumentRow,
  rows: TNodeRow[],
  apiKey: string | null,
): Promise<{ report: TDocumentReport; updates: string[] }> {
  const prepared = rows.map((row) => prepareNode(row, doc.title));
  const report: TDocumentReport = {
    id: doc.id,
    title: doc.title,
    nodeCount: rows.length,
    changed: [],
    llmRejected: [],
    llmFailures: [],
    reverted: [],
  };

  if (apiKey) {
    const outcome = await requestEdits(apiKey, doc.title, collectContentNodes(prepared));
    report.llmFailures = outcome.failures;

    for (const node of prepared) {
      if (node.revertReason || node.content === null) continue;
      const edits = outcome.editsByNode.get(node.row.id);
      if (!edits) continue;

      const result = applyEdits(node.content, edits);
      for (const rejection of result.rejected) {
        report.llmRejected.push({
          nodeId: node.row.id,
          edit: rejection.edit,
          reason: rejection.reason,
        });
      }
      if (result.applied.length === 0) continue;

      if (!verifyContent(node.content, result.text, result.applied)) {
        // Drop the LLM edits; the deterministic layer still applies.
        report.reverted.push({ nodeId: node.row.id, reason: "llm_unexplained_diff" });
        continue;
      }
      node.content = result.text;
      node.llmApplied = result.applied.length;
    }
  }

  const updates: string[] = [];
  for (const node of prepared) {
    if (node.revertReason) {
      report.reverted.push({ nodeId: node.row.id, reason: node.revertReason });
      continue;
    }
    const titleChanged = node.title !== node.row.title;
    const contentChanged = node.content !== node.row.content;
    if (!titleChanged && !contentChanged) continue;

    updates.push(emitUpdate(node));
    report.changed.push({
      id: node.row.id,
      nodeType: node.row.node_type,
      folded: node.folded,
      artifactsRemoved: node.artifactsRemoved,
      titleChanged,
      contentChanged,
      llmApplied: node.llmApplied,
    });
  }
  return { report, updates };
}

async function main() {
  const docs = runD1Json<TDocumentRow>("SELECT id, title FROM documents ORDER BY id;");
  const nodes = runD1Json<TNodeRow>(
    "SELECT id, document_id, node_type, identifier, title, heading, content, position FROM document_nodes ORDER BY document_id, position;",
  );

  const byDoc = new Map<string, TNodeRow[]>();
  for (const node of nodes) {
    const list = byDoc.get(node.document_id) ?? [];
    list.push(node);
    byDoc.set(node.document_id, list);
  }

  const apiKey = SKIP_LLM ? null : readApiKey();
  const updates: string[] = [];
  const reports: TDocumentReport[] = [];

  for (const doc of docs) {
    const { report, updates: docUpdates } = await cleanDocument(
      doc,
      byDoc.get(doc.id) ?? [],
      apiKey,
    );
    reports.push(report);
    updates.push(...docUpdates);
    console.log(
      `[clean] ${doc.id}: ${report.changed.length} changed, ` +
        `${report.reverted.length} reverted, ${report.llmFailures.length} llm failures`,
    );
  }

  const report: TReport = {
    generatedAt: new Date().toISOString(),
    llm: !SKIP_LLM,
    totals: {
      documents: docs.length,
      nodes: nodes.length,
      changed: reports.reduce((n, r) => n + r.changed.length, 0),
      folded: reports.reduce((n, r) => n + r.changed.filter((c) => c.folded).length, 0),
      artifactsRemoved: reports.reduce(
        (n, r) => n + r.changed.reduce((m, c) => m + c.artifactsRemoved, 0),
        0,
      ),
      llmApplied: reports.reduce(
        (n, r) => n + r.changed.reduce((m, c) => m + c.llmApplied, 0),
        0,
      ),
      llmRejected: reports.reduce((n, r) => n + r.llmRejected.length, 0),
      llmFailures: reports.reduce((n, r) => n + r.llmFailures.length, 0),
      reverted: reports.reduce((n, r) => n + r.reverted.length, 0),
    },
    documents: reports,
  };

  writeFileSync(OUT, updates.length > 0 ? `${updates.join("\n")}\n` : "", "utf-8");
  writeFileSync(REPORT_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  console.log(
    `[clean] wrote ${updates.length} UPDATEs → ${OUT} (llm=${report.llm})`,
  );
  console.log(`[clean] wrote report → ${REPORT_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
