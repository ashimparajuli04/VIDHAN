import { Hono } from "hono";
import { streamText, stepCountIs, generateText, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { ModelMessage, ToolCallPart, ToolResultPart } from "ai";
import { ZChatSend, ZCiteOutput, extractLeakedCiteNodeIds, stripToolCallText } from "@vidhan/schema";
import type { TChatMessage, TChatTitle, TReference, TToolCall, TToolResult } from "@vidhan/schema";
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
import { buildTools, chatModel, chatSystemPrompt, prefetchSections, renderPrefetchedContext, TITLE_SYSTEM_PROMPT, titleModel } from "../../ai";
import { resolveReferences } from "../../documents/retrieval";
import { addUsage, getUsage, isOverLimit } from "../../usage";

export const chat = new Hono<TAuthContext>();

chat.use("*", requireAuth());

// Step budget for one answer. A reasoning model spends steps on hidden
// reasoning before each tool call, so the budget must leave a step for the
// final text answer. The last two steps are forced text-only.
const TOOL_STEP_BUDGET = 7;
const FINAL_TEXT_STEP = TOOL_STEP_BUDGET - 2;

// After the first step the model has seen the corpus titles and may still
// reach for coarse discovery tools and loop. Restrict the active set to the
// precise navigation + read + cite + lawyer tools so it commits: inspect a
// summary, read the parts, cite, answer.
const REFINEMENT_TOOLS = [
  "get_document_summary",
  "get_document_outline",
  "get_sections",
  "get_section",
  "search_document_sections",
  "cite",
  "find_lawyers",
  "offer_support_ticket",
] as const;

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
      maxOutputTokens: 400,
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

  const usage = await getUsage(db, c.get("user").id);
  if (isOverLimit(usage)) {
    return c.json({ error: "usage_limit_exceeded", ...usage }, 429);
  }

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

  // Rank the corpus once and inject the top sections, so a common topic
  // question skips the list→search→outline→read tool chain.
  const prefetched = await prefetchSections(c.env, userMessage.content);
  const prefetchedContext =
    prefetched.length > 0
      ? `Relevant provisions retrieved for this question:\n\n${renderPrefetchedContext(prefetched)}`
      : "";

  const result = streamText({
    model: chatModel(c.env),
    system: chatSystemPrompt(c.get("user").language, c.get("user").district, prefetchedContext),
    messages,
    tools: buildTools(c.env, origin),
    // Prefetched context plus a tool budget: retrieval to read a couple of
    // sections, the cite round-trip, then a summarise step. A reasoning model
    // spends extra hidden steps, so leave headroom.
    stopWhen: stepCountIs(TOOL_STEP_BUDGET),
    // The model can flail past its budget and end on a tool call with no text,
    // leaving the user with only the tool UI. Narrow the tool set after the
    // first step and force a text-only answer on the final steps, so the turn
    // always ends with prose; any cite already recorded is unaffected.
    prepareStep: ({ stepNumber, steps }) => {
      if (stepNumber >= FINAL_TEXT_STEP) {
        // Reserve the last step for prose. Disabling tools while the required
        // `cite` is still unrecorded makes the model write the call into the
        // answer as raw text instead of answering, so force it natively one
        // step earlier.
        const cited = steps.some((step) =>
          step.toolCalls.some((call) => call.toolName === "cite"),
        );
        if (stepNumber === FINAL_TEXT_STEP && !cited) {
          return { toolChoice: { type: "tool" as const, toolName: "cite" } };
        }
        return { toolChoice: "none" };
      }
      if (stepNumber >= 1) return { activeTools: [...REFINEMENT_TOOLS] };
      return undefined;
    },
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
      // `cite` is the only source of the cited refs; parse rather than cast so a
      // malformed tool output degrades to no footer instead of throwing.
      const cited = [...toolResults]
        .reverse()
        .find((result) => result.toolName === "cite");
      const parsedRefs = cited ? ZCiteOutput.safeParse(cited.output) : null;
      const references: TReference[] | null =
        parsedRefs?.success && parsedRefs.data.references.length > 0
          ? parsedRefs.data.references
          : null;
      // When tools were disabled the model may have leaked the cite call as
      // text; strip it from the stored answer and salvage its nodeIds.
      const text = stripToolCallText(event.text);
      const leakedCiteIds =
        references === null ? extractLeakedCiteNodeIds(event.text) : [];
      // Context can tear down once the last chunk flushes; waitUntil keeps the
      // isolate alive for these writes.
      c.executionCtx.waitUntil(
        (async () => {
          const now = new Date().toISOString();
          let resolvedReferences = references;
          if (resolvedReferences === null && leakedCiteIds.length > 0) {
            const resolved = await resolveReferences(db, leakedCiteIds);
            if (resolved.length > 0) resolvedReferences = resolved;
          }
          await insertAssistantMessage(
            db,
            session.id,
            text,
            toolCalls.length > 0 ? toolCalls : null,
            toolResults.length > 0 ? toolResults : null,
            resolvedReferences,
          );
          await touchSession(db, session.id, { updatedAt: now });
          // Title generation is a cheap side-call and deliberately not metered.
          const { inputTokens, outputTokens } = event.totalUsage;
          await addUsage(db, session.userId, (inputTokens ?? 0) + (outputTokens ?? 0));
        })(),
      );
    },
  });

  // The title depends only on the user's query. Generate it inline (not as a
  // detached `void` task): the write below must happen while the writer is
  // still open, or the transient part is dropped when the answer stream closes
  // first. The waitUntil keeps the isolate alive for the DB write.
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Reasoning is internal; streaming it would flood the client with
      // chain-of-thought deltas the UI has no surface for.
      writer.merge(result.toUIMessageStream({ sendReasoning: false }));
      if (!isFirstMessage) return;
      const title = await generateTitle(c.env, userMessage.content);
      c.executionCtx.waitUntil(
        touchSession(db, session.id, {
          title,
          updatedAt: new Date().toISOString(),
        }),
      );
      writer.write({
        type: "data-title",
        id: session.id,
        data: { sessionId: session.id, title } satisfies TChatTitle,
        transient: true,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
});
