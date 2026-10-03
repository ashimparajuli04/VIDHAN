import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

// Seeds the local miniflare R2 bucket ("IMAGES" / vidhan-images) with the
// lawyer portraits from data/portraits, under stable keys that
// src/seed/lawyers.ts records in the lawyers seed (`lawyers/seed/<file>`).
// Exact-pinned miniflare matches wrangler's bundled version so the persist
// layout (apps/api/.wrangler/state/v3) is byte-for-byte the one `wrangler dev`
// reads. Stop `wrangler dev` before running this — both open the same sqlite.
const HERE = dirname(fileURLToPath(import.meta.url));
const PERSIST = resolve(HERE, "..", "..", ".wrangler", "state", "v3");
const PORTRAITS = resolve(HERE, "..", "..", "..", "..", "data", "portraits");

const DIRS = ["male", "female"] as const;

async function main() {
  const mf = new Miniflare({
    workers: [
      {
        config: {
          name: "seed-images",
          compatibilityDate: "2025-01-01",
          manifest: {
            mainModule: "seed.mjs",
            modules: {
              "seed.mjs": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('ok'); } };",
              },
            },
          },
          env: {
            IMAGES: { type: "r2", name: "vidhan-images" },
          },
        },
      },
    ],
    resourcePersistencePath: PERSIST,
  });
  try {
    const r2 = await mf.getR2Bucket("IMAGES");
    let total = 0;
    for (const gender of DIRS) {
      const files = (await readdir(resolve(PORTRAITS, gender)))
        .filter((f) => f.endsWith(".jpg"))
        .sort();
      for (const file of files) {
        const key = `lawyers/seed/${file}`;
        const body = await readFile(resolve(PORTRAITS, gender, file));
        await r2.put(key, body, { httpMetadata: { contentType: "image/jpeg" } });
        total++;
      }
      console.log(`[seed:images] ${gender}: ${files.length} portraits`);
    }
    console.log(`[seed:images] uploaded ${total} portraits to ${PERSIST}`);
  } finally {
    await mf.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});