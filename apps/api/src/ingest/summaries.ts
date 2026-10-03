import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { callOpenRouter } from "../ai/openrouter";
import { API_ROOT, readApiKey, runD1Json } from "./d1";

// Generates `documents.summary` with the same OpenRouter model the chat uses.
// Reads the local D1 as JSON (via wrangler), cleans the extracted text, asks
// the model for a terse lead line plus a brief of the top-level parts, and
// emits an UPDATE seed file. Run:
//   pnpm --filter @vidhan/api db:seed:summaries
//   pnpm --filter @vidhan/api db:seed:summaries:load   (loads into local D1)
// Summaries are generated offline so the chat never pays for them.
//
// Pass a document id to summarise just that document, leaving the corpus
// summaries untouched; the delta lands in a separate seed file:
//   pnpm --filter @vidhan/api exec tsx src/ingest/summaries.ts <documentId>
//   pnpm --filter @vidhan/api exec wrangler d1 execute DB --local --file=../../data/documents.summaries.add.seed.sql

const OUT = resolve(API_ROOT, "..", "..", "data", "documents.summaries.seed.sql");
const ADD_OUT = resolve(API_ROOT, "..", "..", "data", "documents.summaries.add.seed.sql");

const MODEL = "deepseek/deepseek-v4-flash-0731";

interface NodeRow {
  id: string;
  document_id: string;
  parent_id: string | null;
  depth: number;
  node_type: string;
  identifier: string;
  title: string;
  heading: string | null;
  content: string | null;
  position: number;
}

interface DocumentRow {
  id: string;
  title: string;
  document_type: string;
}

// PDF extraction leaves artefacts that would pollute a summary: site footers on
// every page, the repeated act title, and the date-of-authentication block. None
// carry legal meaning, so strip them before summarising.
const FOOTER_URL = /^\s*(https?:\/\/\S+|www\.\S+)\s*$/gm;
const PAGE_NUMBER = /^\s*(?:page\s*)?\d{1,4}\s*$/gim;
const DATE_BLOCK =
  /^\s*(date of authentication and publication|act no\.\s*\d+ of the year)[\s\S]*?(?=\n\s*\n|$)/gim;

function cleanContent(text: string): string {
  return text
    .replace(FOOTER_URL, "")
    .replace(DATE_BLOCK, "")
    .replace(PAGE_NUMBER, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Short label for a node, for the model's structural brief.
function nodeLabel(node: NodeRow): string {
  const label = node.heading ?? node.title;
  const id = node.identifier ? `${node.identifier} ` : "";
  return `${id}${label}`.trim();
}

function firstChars(text: string, max: number): string {
  const clean = cleanContent(text);
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

// A chapter's child section headings, so the model can describe what the
// chapter covers without reading every body.
function childHeadings(all: NodeRow[], parentId: string): string[] {
  return all
    .filter((node) => node.parent_id === parentId)
    .map((node) => nodeLabel(node))
    .filter(Boolean);
}

const FEW_PARTS = 12;

// The brief shape depends on how many parts there are. With few, describe each
// part on its own line; with many, group them into ranges so the tool result
// stays short and the model drills into actual sections instead.
function briefInstruction(partCount: number): string {
  if (partCount <= FEW_PARTS) {
    return [
      `List each of the ${partCount} parts on ONE line as:`,
      `"<identifier> (<heading>) — <what it covers>".`,
      "Fragments only; no full sentences, no repeated lead text.",
    ].join(" ");
  }
  return [
    `There are ${partCount} parts. Group them into 3-6 consecutive RANGES, one line each:`,
    `"<first>–<last> (<first heading> … <last heading>) — <what the range covers>".`,
    "Do not list each part separately; the reader fetches exact sections later.",
  ].join(" ");
}

async function callModel(apiKey: string, prompt: string): Promise<string> {
  return callOpenRouter({
    apiKey,
    model: MODEL,
    system:
      "You write terse structural briefs of Nepali statutes for a legal-information assistant. Be accurate and concise; never fabricate.",
    user: prompt,
    // Reasoning tokens would otherwise eat the budget before any content,
    // leaving an empty completion on the larger documents.
    reasoning: false,
    maxTokens: 2500,
  });
}

async function summarise(
  apiKey: string,
  doc: DocumentRow,
  parts: NodeRow[],
  all: NodeRow[],
): Promise<string> {
  const sections = parts
    .map((node) => {
      const children = childHeadings(all, node.id);
      const childList =
        children.length > 0
          ? `\nSections: ${children.join("; ").slice(0, 1500)}`
          : "";
      const body = node.content ? `\n${firstChars(node.content, 900)}` : "";
      return `### ${nodeLabel(node)}${childList}${body}`;
    })
    .join("\n\n")
    .slice(0, 20000);

  const leadLine =
    parts.length <= FEW_PARTS
      ? `"<short document name> — ${parts.length} parts."`
      : `"<short document name> — ${parts.length} parts, grouped."`;

  const prompt = [
    `Document: ${doc.title} (${doc.document_type})`,
    "",
    "Write a brief for this Nepali legal document: one lead line, then the parts.",
    `Lead line exactly: ${leadLine}`,
    "Plain English, fragments only. Never invent provisions, numbers, or dates.",
    "Skip extraction noise (website footers, page numbers, repeated titles).",
    "",
    briefInstruction(parts.length),
    "",
    "Output format:",
    "<the lead line>",
    "<the part lines>",
    "",
    "Document parts:",
    sections,
  ].join("\n");

  try {
    return await callModel(apiKey, prompt);
  } catch (err) {
    if ((err as Error).message !== "empty_completion") throw err;
    // One retry; the failure is a transient empty completion.
    return callModel(apiKey, prompt);
  }
}

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main() {
  const apiKey = readApiKey();
  const onlyId = process.argv[2];
  const out = onlyId ? ADD_OUT : OUT;
  const allDocs = runD1Json<DocumentRow>(
    "SELECT id, title, document_type FROM documents ORDER BY id;",
  );
  const docs = onlyId ? allDocs.filter((doc) => doc.id === onlyId) : allDocs;
  if (docs.length === 0) throw new Error(`no document with id ${onlyId}`);
  const nodes = runD1Json<NodeRow>(
    "SELECT id, document_id, parent_id, depth, node_type, identifier, title, heading, content, position FROM document_nodes ORDER BY document_id, position;",
  );

  const byDoc = new Map<string, NodeRow[]>();
  for (const node of nodes) {
    const list = byDoc.get(node.document_id) ?? [];
    list.push(node);
    byDoc.set(node.document_id, list);
  }

  const updates: string[] = [];
  for (const [index, doc] of docs.entries()) {
    const all = byDoc.get(doc.id) ?? [];
    // Parts are the depth-1 containers (chapter/preamble/section_group); their
    // child sections are fed to the model as headings for the brief.
    const parts = all.filter((node) => node.depth <= 1);
    const seeds = parts.length > 0 ? parts : all.slice(0, FEW_PARTS);
    const progress = `${index + 1}/${docs.length}`;
    console.log(`[summary] ${progress} ${doc.id}: generating (${seeds.length} parts)`);
    try {
      const summary = await summarise(apiKey, doc, seeds, all);
      updates.push(
        `UPDATE documents SET summary = ${q(summary)} WHERE id = ${q(doc.id)};`,
        "",
      );
      console.log(`[summary] ${progress} ${doc.id}: ok`);
    } catch (err) {
      // One bad model response must not lose the whole run; leave it null and
      // report so it can be re-run.
      console.error(`[summary] ${progress} ${doc.id}: FAILED — ${(err as Error).message}`);
    }
    // Flush after every document: a long run stays watchable and a crash keeps
    // the summaries already paid for.
    writeFileSync(out, updates.join("\n"), "utf-8");
  }

  console.log(`[summary] wrote ${updates.length / 2}/${docs.length} summaries → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
