import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "..", "..", "data");

async function main() {
  const files = await readdir(DATA_DIR);
  for (const file of files) {
    const content = await readFile(join(DATA_DIR, file), "utf-8");
    console.log(`[ingest] ${file} (${content.length} chars)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
