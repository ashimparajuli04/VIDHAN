import { embedMany } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModel } from "ai";
import type { Env } from "../index";

// Multilingual embedding for the hybrid retrieval path. Shared by the query
// side (Worker) and the offline ingest script, so the encode/decode helpers
// and the provider wiring live here once. bge-m3 puts English, roman-Nepali
// and Devanagari in one vector space, which is what makes paraphrase and
// cross-lingual queries land.

export function embeddingModel(env: Env): EmbeddingModel {
  const provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: env.OPENROUTER_BASE_URL,
    apiKey: env.OPENROUTER_API_KEY,
  });
  return provider.textEmbeddingModel(env.EMBEDDING_MODEL);
}

// OpenRouter caps embeddings per request; `embedMany` splits oversized batches
// automatically, so no manual chunking is needed here.
export async function embedTexts(env: Env, texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel(env),
    values: texts,
    maxParallelCalls: 1,
  });
  return embeddings;
}

export async function embedQuery(env: Env, text: string): Promise<number[]> {
  const [embedding] = await embedTexts(env, [text]);
  if (!embedding) throw new Error("empty_embedding");
  return normalize(embedding);
}

export function normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

// float32 little-endian, matching the BLOB D1 stores and `arrayBuffer()` reads
// back. L2-normalized at rest so a stored read is a plain dot product.
export function toBlob(vector: number[]): Uint8Array {
  const out = new Uint8Array(vector.length * 4);
  const view = new DataView(out.buffer);
  for (let i = 0; i < vector.length; i++) {
    view.setFloat32(i * 4, vector[i]!, true);
  }
  return out;
}
