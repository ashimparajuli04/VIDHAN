import { z } from "zod/v4";

import { callOpenRouter } from "../ai/openrouter";

// Judgment repairs only. The model returns a surgical edit-list of exact
// find/replace pairs; the deterministic layer (normalize.ts) has already done
// all structural work. Applied only on exact-once matches, so "no data lost,
// meaning unchanged" is mechanical rather than a matter of trusting the model.

const MODEL = "deepseek/deepseek-v4-flash-0731";
const MAX_CHUNK_CHARS = 8000;

export const ZEdit = z.object({
  find: z.string().min(1),
  replace: z.string(),
  reason: z.string().min(1),
});
export type TEdit = z.infer<typeof ZEdit>;

export const ZNodeEdits = z.object({
  id: z.string(),
  edits: z.array(ZEdit),
});
export type TNodeEdits = z.infer<typeof ZNodeEdits>;

// JSON mode wants an object at the top level; `nodes` holds the per-node lists.
export const ZEditResponse = z.object({ nodes: z.array(ZNodeEdits) });

export interface TContentNode {
  id: string;
  content: string;
}

export type TRejectionReason = "zero_match" | "multi_match" | "self_referential";

export interface TApplyResult {
  text: string;
  applied: TEdit[];
  rejected: { edit: TEdit; reason: TRejectionReason }[];
}

export interface TEditFailure {
  nodeIds: string[];
  error: string;
}

export interface TEditBatchOutcome {
  editsByNode: Map<string, TEdit[]>;
  failures: TEditFailure[];
}

// Pack nodes into ~8k-char chunks. A single oversized node gets its own chunk
// rather than being split, so a node's content always reaches the model whole.
export function chunkContent(nodes: TContentNode[]): TContentNode[][] {
  const chunks: TContentNode[][] = [];
  let current: TContentNode[] = [];
  let size = 0;
  for (const node of nodes) {
    if (current.length > 0 && size + node.content.length > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(node);
    size += node.content.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// Apply edits left-to-right. An edit whose `find` is absent or occurs more than
// once is rejected; `replace` containing `find` is rejected too, so a re-run
// cannot match the same text again (idempotency).
export function applyEdits(text: string, edits: TEdit[]): TApplyResult {
  let out = text;
  const applied: TEdit[] = [];
  const rejected: { edit: TEdit; reason: TRejectionReason }[] = [];

  for (const edit of edits) {
    if (edit.replace.includes(edit.find)) {
      rejected.push({ edit, reason: "self_referential" });
      continue;
    }
    const first = out.indexOf(edit.find);
    if (first === -1) {
      rejected.push({ edit, reason: "zero_match" });
      continue;
    }
    if (out.indexOf(edit.find, first + edit.find.length) !== -1) {
      rejected.push({ edit, reason: "multi_match" });
      continue;
    }
    out = out.slice(0, first) + edit.replace + out.slice(first + edit.find.length);
    applied.push(edit);
  }
  return { text: out, applied, rejected };
}

const WHITESPACE = /[\s\u00A0\u2007\u202F\u200B\u200C\u200D\uFEFF]+/g;

// The applied edits must fully explain the difference between the deterministic
// and final text; if they do not, some text changed without a recorded edit and
// the node is reverted.
export function verifyContent(
  before: string,
  after: string,
  applied: TEdit[],
): boolean {
  let expected = before.replace(WHITESPACE, "");
  for (const edit of applied) {
    const find = edit.find.replace(WHITESPACE, "");
    const replace = edit.replace.replace(WHITESPACE, "");
    if (find.length === 0) continue;
    const first = expected.indexOf(find);
    if (first === -1) return false;
    if (expected.indexOf(find, first + find.length) !== -1) return false;
    expected = expected.slice(0, first) + replace + expected.slice(first + find.length);
  }
  return expected === after.replace(WHITESPACE, "");
}

const SYSTEM_PROMPT =
  "You repair OCR and PDF-extraction errors in Nepali statutes. You never " +
  "rewrite, summarise, reorder, or modernise text. You return only minimal, " +
  "exact find/replace edits that fix extraction errors.";

function buildPrompt(documentTitle: string, nodes: TContentNode[]): string {
  return [
    `Document: ${documentTitle}`,
    "",
    "Each node below has an id and its extracted content. Find clear extraction",
    "errors and return JSON of this exact shape:",
    '{"nodes":[{"id":"<node id>","edits":[{"find":"<exact substring>","replace":"<fix>","reason":"<short reason>"}]}]}',
    "",
    "Rules:",
    "- `find` must be copied character-for-character from that node's content and must occur EXACTLY ONCE in it.",
    "- Make the smallest edit that fixes the error. Do not change wording, punctuation, or spacing beyond the error.",
    '- Fix only extraction faults: split words ("financia lly"), wrong characters ("Graff" -> "Graft"), duplicated fragments, broken ligatures, leftover artifact text.',
    "- Do NOT fix legal wording, style, or capitalisation, and never add or remove provisions.",
    "- Omit nodes with no errors. If nothing needs fixing, return {\"nodes\":[]}.",
    "- Output JSON only, no prose.",
    "",
    "Nodes:",
    JSON.stringify(nodes),
  ].join("\n");
}

function extractJson(text: string): string {
  const fenced = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  return start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;
}

async function requestChunk(
  apiKey: string,
  documentTitle: string,
  nodes: TContentNode[],
): Promise<TNodeEdits[]> {
  const raw = await callOpenRouter({
    apiKey,
    model: MODEL,
    system: SYSTEM_PROMPT,
    user: buildPrompt(documentTitle, nodes),
    temperature: 0,
    json: true,
    reasoning: false,
    maxTokens: 4000,
  });
  return ZEditResponse.parse(JSON.parse(extractJson(raw))).nodes;
}

// A failed or invalid batch is recorded and skipped; it never alters a node.
export async function requestEdits(
  apiKey: string,
  documentTitle: string,
  nodes: TContentNode[],
): Promise<TEditBatchOutcome> {
  const editsByNode = new Map<string, TEdit[]>();
  const failures: TEditFailure[] = [];

  for (const chunk of chunkContent(nodes)) {
    const ids = chunk.map((node) => node.id);
    try {
      for (const entry of await requestChunk(apiKey, documentTitle, chunk)) {
        if (entry.edits.length > 0) editsByNode.set(entry.id, entry.edits);
      }
    } catch (err) {
      failures.push({ nodeIds: ids, error: (err as Error).message });
    }
  }
  return { editsByNode, failures };
}
