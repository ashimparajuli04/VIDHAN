import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { Env } from "../index";

function provider(env: Env) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: env.OPENROUTER_BASE_URL,
    apiKey: env.OPENROUTER_API_KEY,
  });
}

export function chatModel(env: Env): LanguageModel {
  return provider(env)(env.CHAT_MODEL);
}

export function titleModel(env: Env): LanguageModel {
  return provider(env)(env.TITLE_MODEL);
}
