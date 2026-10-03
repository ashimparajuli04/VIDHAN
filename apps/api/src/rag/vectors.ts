import type { Db } from "../db";
import { sql } from "drizzle-orm";

// Brute-force vector search over the stored section embeddings. The corpus is
// ~1510 nodes × 1024 dims ≈ 6 MB, so a full scan in the Worker is a few ms and
// avoids a Vectorize binding (which has no local emulation). Revisit at 100k+
// vectors.

export type TLoadedVector = {
  nodeId: string;
  vector: Float32Array;
};

// Isolate-level cache keyed by model. The table is read-mostly, so a warm
// isolate reuses the same vectors across turns; a model switch loads a fresh
// set rather than mixing spaces.
let cache: { model: string; vectors: TLoadedVector[] } | null = null;

export async function loadVectors(db: Db, model: string): Promise<TLoadedVector[]> {
  if (cache && cache.model === model) return cache.vectors;

  const rows = await db.all<{
    node_id: string;
    dims: number;
    vector: ArrayBuffer | number[];
  }>(sql`SELECT node_id, dims, vector FROM document_node_embeddings WHERE model = ${model}`);

  const vectors: TLoadedVector[] = [];
  for (const row of rows) {
    const bytes = toBytes(row.vector);
    // The blob length is the source of truth for a valid view; a short or
    // unaligned blob (dim mismatch, corrupt seed) is skipped rather than
    // throwing on Float32Array construction.
    if (!bytes || bytes.byteLength < row.dims * 4 || bytes.byteLength % 4 !== 0) continue;
    vectors.push({
      nodeId: row.node_id,
      vector: new Float32Array(bytes, 0, row.dims),
    });
  }

  cache = { model, vectors };
  return vectors;
}

// D1 returns a BLOB as an ArrayBuffer in the Worker runtime; the local CLI JSON
// path yields a byte array. Normalize both to a standalone ArrayBuffer so the
// Float32Array view is independent of the source buffer's offset.
function toBytes(value: ArrayBuffer | number[]): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) {
    return value.byteLength % 4 === 0 ? value : value.slice(0, value.byteLength - (value.byteLength % 4));
  }
  if (Array.isArray(value)) {
    const view = Uint8Array.from(value);
    return view.buffer;
  }
  return null;
}

// Dot product is cosine because stored and query vectors are L2-normalized.
export function cosineTopK(
  vectors: TLoadedVector[],
  query: Float32Array,
  limit: number,
): { nodeId: string; score: number }[] {
  const scored: { nodeId: string; score: number }[] = [];
  for (const { nodeId, vector } of vectors) {
    if (vector.length !== query.length) continue;
    let score = 0;
    for (let i = 0; i < vector.length; i++) score += vector[i]! * query[i]!;
    scored.push({ nodeId, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
