export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface TOpenRouterRequest {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask OpenRouter for a JSON object response. */
  json?: boolean;
  /**
   * Set false to disable reasoning tokens. Without this the larger inputs can
   * spend the whole budget on reasoning and return an empty completion.
   */
  reasoning?: boolean;
}

// Shared by the offline scripts (ingest/summaries.ts, clean/llm.ts). Node-only
// callers read the key from .dev.vars; this module stays fetch-only so it can
// sit under src/ai without pulling node built-ins into the Worker graph.
export async function callOpenRouter(req: TOpenRouterRequest): Promise<string> {
  const body: Record<string, unknown> = {
    model: req.model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    max_tokens: req.maxTokens ?? 2500,
  };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.json) body.response_format = { type: "json_object" };
  if (req.reasoning === false) body.reasoning = { enabled: false };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${req.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`openrouter_${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty_completion");
  return text;
}
