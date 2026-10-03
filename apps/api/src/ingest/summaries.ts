import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Generates `documents.summary` with the same OpenRouter model the chat uses.
// Reads the local D1 as JSON (via wrangler), cleans the extracted text, asks
// the model for a short prose summary plus a brief of the top-level parts, and
// emits an UPDATE seed file. Run:
//   pnpm --filter @vidhan/api db:seed:summaries
//   pnpm --filter @vidhan/api db:seed:summaries:load   (loads into local D1)
// Summaries are generated offline so the chat never pays for them.

const HERE = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(HERE, "..", "..");
const OUT = resolve(API_ROOT, "..", "..", "data", "documents.summaries.seed.sql");

const MODEL = "deepseek/deepseek-v4-flash-0731";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

function runD1Json<T>(sql: string): T[] {
  // Command string (not argv): the SQL contains spaces/quotes, and the shell
  // form is the only reliable way to pass a single --command value on Windows.
  const command = `pnpm exec wrangler d1 execute DB --local --json --command="${sql.replace(/"/g, '\\"')}"`;
  const out = execFileSync(command, {
    cwd: API_ROOT,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
  });
  const start = out.indexOf("[");
  const parsed = JSON.parse(out.slice(start)) as {
    results?: T[];
  }[];
  return parsed.flatMap((entry) => entry.results ?? []);
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
      `Below the summary, list each of the ${partCount} parts on ONE line as:`,
      `"<identifier> (<heading>) — <what it covers, concise>".`,
      "Keep every line to one clause; do not repeat the summary text.",
    ].join(" ");
  }
  return [
    `There are ${partCount} parts. Group them into 3-6 consecutive RANGES and give`,
    `each range ONE line as: "<first>–<last> (<first heading> … <last heading>) — <what the range covers>".`,
    "Do not list each part separately; the reader will fetch the exact section later.",
  ].join(" ");
}

async function callModel(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You summarise Nepali statutes for a legal-information assistant. Be accurate and concise; never fabricate.",
        },
        { role: "user", content: prompt },
      ],
      // Reasoning tokens would otherwise eat the budget before any content,
      // leaving an empty completion on the larger documents.
      reasoning: { enabled: false },
      max_tokens: 2500,
    }),
  });
  if (!response.ok) {
    throw new Error(`openrouter_${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty_summary");
  return text;
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

  const prompt = [
    `Document: ${doc.title} (${doc.document_type})`,
    "",
    "Write a factual summary of this Nepali legal document in 100-160 words.",
    "Then produce a parts brief in the exact format below.",
    "Use plain English. Do not invent provisions, numbers, or dates.",
    "Skip extraction noise (website footers, page numbers, repeated titles).",
    "",
    briefInstruction(parts.length),
    "",
    "Output format:",
    "SUMMARY: <the prose summary>",
    "PARTS:",
    "<one or more brief lines>",
    "",
    "Document parts:",
    sections,
  ].join("\n");

  try {
    return await callModel(apiKey, prompt);
  } catch (err) {
    if ((err as Error).message !== "empty_summary") throw err;
    // One retry; the failure is a transient empty completion.
    return callModel(apiKey, prompt);
  }
}

function readApiKey(): string {
  const vars = readFileSync(resolve(API_ROOT, ".dev.vars"), "utf-8");
  const match = vars.match(/^OPENROUTER_API_KEY\s*=\s*"?(.+?)"?\s*$/m);
  if (!match?.[1]) throw new Error("OPENROUTER_API_KEY missing from .dev.vars");
  return match[1];
}

function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main() {
  const apiKey = readApiKey();
  const docs = runD1Json<DocumentRow>(
    "SELECT id, title, document_type FROM documents ORDER BY id;",
  );
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
  for (const doc of docs) {
    const all = byDoc.get(doc.id) ?? [];
    // Parts are the depth-1 containers (chapter/preamble/section_group); their
    // child sections are fed to the model as headings for the brief.
    const parts = all.filter((node) => node.depth <= 1);
    const seeds = parts.length > 0 ? parts : all.slice(0, FEW_PARTS);
    console.log(`[summary] ${doc.id}: ${seeds.length} parts`);
    try {
      const summary = await summarise(apiKey, doc, seeds, all);
      updates.push(
        `UPDATE documents SET summary = ${q(summary)} WHERE id = ${q(doc.id)};`,
        "",
      );
    } catch (err) {
      // One bad model response must not lose the whole run; leave it null and
      // report so it can be re-run.
      console.error(`[summary] ${doc.id}: FAILED — ${(err as Error).message}`);
    }
  }

  writeFileSync(OUT, updates.join("\n"), "utf-8");
  console.log(`[summary] wrote ${docs.length} summaries → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
