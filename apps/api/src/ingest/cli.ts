import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chunkPlan } from "../rag/chunker";

const DATA_DIR = join(process.cwd(), "..", "..", "data");
const OUT = join(DATA_DIR, "content.seed.sql");

// Markdown files in data/ map to seed document ids. Files named
// `seed-doc-NNN.md` attach to that id; anything else falls back here.
const DEFAULT_DOCUMENT_ID = "seed-doc-001";

// A heading is a line starting with 1-6 `#`. The capture also swallows a
// trailing '#'-variant (ATX closing sequence) implicitly — we store the
// line text after the hashes as-is.
const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;

interface TocEntry {
  position: number;
  level: number;
  text: string;
  chunkIndex: number;
}

// Every markdown heading of the trimmed source, annotated with the chunk
// index it falls in. The chunk start offsets come from chunkPlan's plan,
// which used the exact same text — headings can never map to a wrong chunk.
function buildToc(source: string, plan: { start: number }[]): TocEntry[] {
  const entries: TocEntry[] = [];
  let m: RegExpExecArray | null;
  let chunkCursor = 0;

  while ((m = HEADING_RE.exec(source)) !== null) {
    while (
      chunkCursor + 1 < plan.length &&
      plan[chunkCursor + 1]!.start <= m.index
    ) {
      chunkCursor++;
    }
    entries.push({
      position: entries.length,
      level: m[1]!.length,
      text: m[2]!.trim(),
      chunkIndex: chunkCursor,
    });
  }
  return entries;
}

async function main() {
  const files = (await readdir(DATA_DIR)).filter((file) => file.endsWith(".md"));
  if (files.length === 0) {
    console.log("[ingest] no .md files in data/, nothing to do");
    process.exit(0);
  }

  const byDocument = new Map<string, { chunks: string[]; toc: TocEntry[] }>();
  for (const file of files) {
    const content = await readFile(join(DATA_DIR, file), "utf-8");
    const id = /^seed-doc-\d{3}\.md$/.test(file)
      ? file.replace(/\.md$/, "")
      : DEFAULT_DOCUMENT_ID;

    const source = content.trim();
    const plan = chunkPlan(source);
    if (plan.length === 0) {
      console.warn(`[ingest] ${file}: no chunks (skipping)`);
      continue;
    }
    byDocument.set(id, {
      chunks: plan.map((piece) => piece.content),
      toc: buildToc(source, plan),
    });
    console.log(
      `[ingest] ${file} -> ${id}: ${plan.length} chunks, ${byDocument.get(id)!.toc.length} headings`,
    );
  }

  if (byDocument.size === 0) {
    console.error("[ingest] no content produced");
    process.exit(1);
  }

  const documentIds = [...byDocument.keys()];
  const lines: string[] = [];

  for (const id of documentIds) {
    const { chunks, toc } = byDocument.get(id)!;
    // Re-running is idempotent: wipe the doc's rows before re-inserting.
    lines.push(`DELETE FROM document_chunks WHERE document_id = '${id}';`);
    lines.push(`INSERT INTO document_chunks (document_id, chunk_index, content) VALUES`);
    lines.push(
      chunks
        .map((piece, index) => `  ('${id}', ${index}, '${piece.replace(/'/g, "''")}')`)
        .join(",\n"),
    );
    lines.push(";");
    lines.push(
      `UPDATE documents SET chunk_count = ${chunks.length}, status = 'indexed' WHERE id = '${id}';`,
    );
    lines.push("");
    if (toc.length > 0) {
      lines.push(`DELETE FROM document_toc WHERE document_id = '${id}';`);
      lines.push(`INSERT INTO document_toc (document_id, position, level, text, chunk_index) VALUES`);
      lines.push(
        toc
          .map(
            (entry) =>
              `  ('${id}', ${entry.position}, ${entry.level}, '${entry.text.replace(/'/g, "''")}', ${entry.chunkIndex})`,
          )
          .join(",\n"),
      );
      lines.push(";");
      lines.push("");
    }
  }

  // Content stays null for every other document: no rows, counts zeroed,
  // seeds' fake statuses cleared.
  lines.push(
    `UPDATE documents SET chunk_count = 0, status = 'pending' WHERE id NOT IN (${documentIds.map((id) => `'${id}'`).join(", ")});`,
  );

  await writeFile(OUT, lines.join("\n"), "utf-8");
  console.log(`[ingest] wrote content seed to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});