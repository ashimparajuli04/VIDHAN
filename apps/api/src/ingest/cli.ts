import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chunk } from "../rag/chunker";

const DATA_DIR = join(process.cwd(), "..", "..", "data");
const OUT = join(DATA_DIR, "content.seed.sql");

// Markdown files in data/ map to seed document ids. Files named
// `seed-doc-NNN.md` attach to that id; anything else falls back here.
const DEFAULT_DOCUMENT_ID = "seed-doc-001";

async function main() {
  const files = (await readdir(DATA_DIR)).filter((file) => file.endsWith(".md"));
  if (files.length === 0) {
    console.log("[ingest] no .md files in data/, nothing to do");
    process.exit(0);
  }

  const byDocument = new Map<string, string[]>();
  for (const file of files) {
    const content = await readFile(join(DATA_DIR, file), "utf-8");
    const id = /^seed-doc-\d{3}\.md$/.test(file)
      ? file.replace(/\.md$/, "")
      : DEFAULT_DOCUMENT_ID;

    const chunks = chunk(content);
    if (chunks.length === 0) {
      console.warn(`[ingest] ${file}: no chunks (skipping)`);
      continue;
    }
    byDocument.set(id, chunks);
    console.log(`[ingest] ${file} -> ${id}: ${chunks.length} chunks`);
  }

  if (byDocument.size === 0) {
    console.error("[ingest] no content produced");
    process.exit(1);
  }

  const documentIds = [...byDocument.keys()];
  const lines: string[] = [];

  for (const id of documentIds) {
    const chunks = byDocument.get(id)!;
    // Re-running is idempotent: wipe the doc's chunks before re-inserting.
    lines.push(`DELETE FROM document_chunks WHERE document_id = '${id}';`);
    lines.push(`INSERT INTO document_chunks (document_id, chunk_index, content) VALUES`);
    lines.push(
      chunks
        .map((piece, index) => `  ('${id}', ${index}, '${piece.replace(/'/g, "''")}')`)
        .join(",\n"),
    );
    lines.push(";");
    lines.push(`UPDATE documents SET chunk_count = ${chunks.length}, status = 'indexed' WHERE id = '${id}';`);
    lines.push("");
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