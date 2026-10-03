import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node-only helpers for the offline seed/clean scripts. Kept out of the Worker
// import graph (nothing under src/index.ts imports this file), so the
// `node:*` imports never reach the bundle.

const HERE = dirname(fileURLToPath(import.meta.url));
export const API_ROOT = resolve(HERE, "..", "..");

// Command string (not argv): the SQL contains spaces/quotes, and the shell
// form is the only reliable way to pass a single --command value on Windows.
export function runD1Json<T>(sql: string): T[] {
  const command = `pnpm exec wrangler d1 execute DB --local --json --command="${sql.replace(/"/g, '\\"')}"`;
  const out = execFileSync(command, {
    cwd: API_ROOT,
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    shell: true,
  });
  const start = out.indexOf("[");
  const parsed = JSON.parse(out.slice(start)) as { results?: T[] }[];
  return parsed.flatMap((entry) => entry.results ?? []);
}

export function readApiKey(): string {
  const vars = readFileSync(resolve(API_ROOT, ".dev.vars"), "utf-8");
  const match = vars.match(/^OPENROUTER_API_KEY\s*=\s*"?(.+?)"?\s*$/m);
  if (!match?.[1]) throw new Error("OPENROUTER_API_KEY missing from .dev.vars");
  return match[1];
}

// Offline scripts need the same model/dims the Worker reads from wrangler vars.
// Parsed from wrangler.toml so the seed can never drift from the runtime config.
export function readEmbeddingConfig(): { model: string; dims: number } {
  const toml = readFileSync(resolve(API_ROOT, "wrangler.toml"), "utf-8");
  const model = toml.match(/^EMBEDDING_MODEL\s*=\s*"([^"]+)"/m)?.[1];
  const dims = toml.match(/^EMBEDDING_DIMS\s*=\s*"?(\d+)"?/m)?.[1];
  if (!model || !dims) throw new Error("EMBEDDING_MODEL / EMBEDDING_DIMS missing from wrangler.toml");
  return { model, dims: Number(dims) };
}
