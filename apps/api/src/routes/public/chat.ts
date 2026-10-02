import { Hono } from "hono";
import { streamText, stepCountIs, generateText } from "ai";
import type { ModelMessage, ToolCallPart, ToolResultPart } from "ai";
import { ZChatSend } from "@vidhan/schema";
import type { TChatMessage, TToolCall, TToolResult } from "@vidhan/schema";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import { requireAuth, type TAuthContext } from "../../auth";
import {
  createSession,
  deleteSession,
  findSession,
  insertAssistantMessage,
  insertUserMessage,
  listMessages,
  listSessions,
  touchSession,
} from "../../chat";
import { buildTools, chatModel, chatSystemPrompt, TITLE_SYSTEM_PROMPT, titleModel } from "../../ai";

export const chat = new Hono<TAuthContext>();

chat.use("*", requireAuth());

chat.post("/sessions", async (c) => {
  const db = createDb(c.env.DB);
  const session = await createSession(db, c.get("user").id);
  return c.json({ session }, 201);
});

chat.get("/sessions", async (c) => {
  const db = createDb(c.env.DB);
  const sessions = await listSessions(db, c.get("user").id);
  return c.json({ sessions });
});

chat.get("/sessions/:id", async (c) => {
  const db = createDb(c.env.DB);
  const session = await findSession(db, c.req.param("id"), c.get("user").id);
  if (!session) return c.json({ error: "not_found" }, 404);
  const messages = await listMessages(db, session.id);
  return c.json({ session, messages });
});

chat.delete("/sessions/:id", async (c) => {
  const db = createDb(c.env.DB);
  const ok = await deleteSession(db, c.req.param("id"), c.get("user").id);
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

// Rebuild prior turns in the AI SDK's prompt shape. Tool calls and results are
// stored on the assistant message as parallel arrays; split them back into an
// assistant message + the tool message that follows it.
function toModelMessages(history: TChatMessage[]): ModelMessage[] {
  const messages: ModelMessage[] = [];
  for (const row of history) {
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
      continue;
    }
    const calls = row.toolCalls ?? [];
    const results = row.toolResults ?? [];
    if (calls.length === 0) {
      messages.push({ role: "assistant", content: row.content });
      continue;
    }
    const parts: (ToolCallPart | { type: "text"; text: string })[] = calls.map((call) => ({
      type: "tool-call",
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: call.input,
    }));
    if (row.content) parts.push({ type: "text", text: row.content });
    messages.push({ role: "assistant", content: parts });
    if (results.length > 0) {
      messages.push({
        role: "tool",
        content: results.map(
          (result): ToolResultPart => ({
            type: "tool-result",
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            output: { type: "json", value: result.output as never },
          }),
        ),
      });
    }
  }
  return messages;
}

async function generateTitle(env: TAuthContext["Bindings"], message: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: titleModel(env),
      system: TITLE_SYSTEM_PROMPT,
      prompt: message,
      maxOutputTokens: 32,
    });
    const title = text.trim().replace(/^"|"$/g, "").trim();
    return title.slice(0, 80) || "New chat";
  } catch (err) {
    console.error(err);
    return message.slice(0, 60);
  }
}

chat.post("/sessions/:id/messages", async (c) => {
  const parsed = await parseJson(c, ZChatSend);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const session = await findSession(db, c.req.param("id"), c.get("user").id);
  if (!session) return c.json({ error: "not_found" }, 404);

  const origin = new URL(c.req.url).origin;
  const priorMessages = await listMessages(db, session.id);
  const isFirstMessage = priorMessages.length === 0;

  // Persist the user turn before streaming so a failed AI call still keeps it.
  const userMessage = await insertUserMessage(db, session.id, parsed.data.content);
  const messages: ModelMessage[] = [
    ...toModelMessages(priorMessages),
    { role: "user", content: userMessage.content },
  ];

  const result = streamText({
    model: chatModel(c.env),
    system: chatSystemPrompt(c.get("user").language),
    messages,
    tools: buildTools(c.env, origin),
    // Step once more after a tool result so the model summarises the lawyers.
    stopWhen: stepCountIs(3),
    onFinish: (event) => {
      // Tool calls live in the step that invoked them, not the final step that
      // summarises the result, so aggregate across every step.
      const toolCalls: TToolCall[] = event.steps.flatMap((step) =>
        step.toolCalls.map((call) => ({
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          input: call.input,
        })),
      );
      const toolResults: TToolResult[] = event.steps.flatMap((step) =>
        step.toolResults.map((toolResult) => ({
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          output: toolResult.output,
        })),
      );
      // Context can tear down once the last chunk flushes; waitUntil keeps the
      // isolate alive for these writes.
      c.executionCtx.waitUntil(
        (async () => {
          const now = new Date().toISOString();
          await insertAssistantMessage(
            db,
            session.id,
            event.text,
            toolCalls.length > 0 ? toolCalls : null,
            toolResults.length > 0 ? toolResults : null,
          );
          const patch: { updatedAt: string; title?: string } = { updatedAt: now };
          if (isFirstMessage) patch.title = await generateTitle(c.env, userMessage.content);
          await touchSession(db, session.id, patch);
        })(),
      );
    },
  });

  return result.toUIMessageStreamResponse();
});
