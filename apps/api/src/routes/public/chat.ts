import { Hono } from "hono";
import { streamText, stepCountIs, generateText, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { AssistantModelMessage, AsyncIterableStream, InferUIMessageChunk, ModelMessage, ToolCallPart, ToolModelMessage, ToolResultPart, UIMessage, UIMessageStreamWriter } from "ai";
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
import {
  buildTools,
  chatAnswerSystemPrompt,
  chatModel,
  chatSystemPrompt,
  prefetchSections,
  renderPrefetchedContext,
  TITLE_SYSTEM_PROMPT,
  titleModel,
} from "../../ai";
import { resolveReferences } from "../../documents/retrieval";
import { addUsage, getUsage, isOverLimit } from "../../usage";

export const chat = new Hono<TAuthContext>();

chat.use("*", requireAuth());

// Step budget for the tool phase. The answer is generated in a separate
// tool-free call, so every step can be spent on retrieval; a reasoning model
// spends hidden reasoning before each tool call, so leave headroom.
const TOOL_STEP_BUDGET = 7;
// If cite is still unrecorded by this step, force it so the sources row is
// populated even when the model forgets.
const CITE_STEP = TOOL_STEP_BUDGET - 1;
// The first answer attempt produces the answer; the second runs only if the
// first yielded no prose (e.g. the provider returned tool-call markup the
// stripper removed). Two attempts make an empty bubble very unlikely.
const MAX_ANSWER_ATTEMPTS = 2;

// Closing user turn for the tool-free answer phase. Some providers need a user
// message, not only a system line, to switch from acting to answering.
const FINAL_ANSWER_INSTRUCTION =
  "Now write the final answer to my question in plain language, using the retrieved sections and results above.";

const ANSWER_REPAIR_INSTRUCTION =
  "Your previous output contained no usable answer text. Write the answer now as plain prose.";

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

// Every tool key buildTools returns; step 0 has no activeTools restriction
// by default, so research mode needs its own full-width list to keep
// find_lawyers out from the first step on.
const ALL_TOOLS = [
  "find_lawyers",
  "list_documents",
  "get_document_titles",
  "get_document_summary",
  "get_sections",
  "search_documents",
  "get_document_outline",
  "search_document_sections",
  "get_section",
  "offer_support_ticket",
  "cite",
] as const;

// Research mode means the message poses a scenario for study, not a request
// for the sender's own matter — find_lawyers is dropped from the active set
// so the model cannot recommend one.
const RESEARCH_TOOLS = ALL_TOOLS.filter((name) => name !== "find_lawyers");
const RESEARCH_REFINEMENT_TOOLS = REFINEMENT_TOOLS.filter(
  (name) => name !== "find_lawyers",
);

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

// A provider can ignore a forced `cite` call, leaving a cited answer without
// references. Fall back to the node ids of the last read tool result so the
// sources row still reflects the provisions the answer was built on.
function readNodeIds(results: TToolResult[]): string[] {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index];
    if (
      !result ||
      (result.toolName !== "get_sections" && result.toolName !== "get_section")
    ) {
      continue;
    }
    const output = result.output;
    if (!output || typeof output !== "object") continue;
    const record = output as { sections?: unknown; nodeId?: unknown };
    if (Array.isArray(record.sections)) {
      const nodeIds: string[] = [];
      for (const section of record.sections) {
        const nodeId = (section as { nodeId?: unknown }).nodeId;
        if (typeof nodeId === "string") nodeIds.push(nodeId);
      }
      if (nodeIds.length > 0) return [...new Set(nodeIds)];
    }
    if (typeof record.nodeId === "string") return [record.nodeId];
  }
  return [];
}

// The answer phase must not see the tool phase's working narrative. Phase-1
// reasoning and text deliberate about tools and instructions ("I don't have
// find_lawyers available in this environment"), and feeding that back primes
// the answer model to expose the same. Only tool calls, their results, and the
// retrieved facts cross the phase boundary.
function workingTranscript(
  messages: Array<AssistantModelMessage | ToolModelMessage>,
): ModelMessage[] {
  const resultIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== "tool") continue;
    for (const part of message.content) {
      if (part.type === "tool-result") resultIds.add(part.toolCallId);
    }
  }

  const transcript: ModelMessage[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") {
      transcript.push(message);
      continue;
    }
    if (typeof message.content === "string") continue;
    const parts = message.content.filter(
      (part) =>
        part.type !== "text" &&
        part.type !== "reasoning" &&
        // A call the provider dropped has no result; forwarding it would hand
        // the answer phase a dangling tool call.
        (part.type !== "tool-call" || resultIds.has(part.toolCallId)),
    );
    if (parts.length === 0) continue;
    transcript.push({ role: "assistant", content: parts });
  }
  return transcript;
}

type TChatChunk = InferUIMessageChunk<UIMessage>;

// Streams one phase's UI chunks into the single assistant message. The tool
// phase runs with keepText false: the model narrates its plan while it works,
// and that text must not reach the answer bubble.
async function pipePhase(
  writer: UIMessageStreamWriter,
  stream: AsyncIterableStream<TChatChunk>,
  keepText: boolean,
): Promise<void> {
  for await (const chunk of stream) {
    if (
      !keepText &&
      (chunk.type === "text-start" ||
        chunk.type === "text-delta" ||
        chunk.type === "text-end")
    ) {
      continue;
    }
    writer.write(chunk);
  }
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

  const mode = parsed.data.mode;

  // Persist the user turn before streaming so a failed AI call still keeps it.
  const userMessage = await insertUserMessage(db, session.id, parsed.data.content);

  const messages: ModelMessage[] = [
    ...toModelMessages(priorMessages),
    { role: "user", content: userMessage.content },
  ];

  // Rank the corpus once and inject the top sections, so a common topic
  // question skips the list→search→outline→read tool chain. Both phases get
  // this context: the answer phase sees it in the system prompt because it
  // never received it as messages.
  const prefetched = await prefetchSections(c.env, userMessage.content);
  const prefetchedContext =
    prefetched.length > 0
      ? `Relevant provisions retrieved for this question:\n\n${renderPrefetchedContext(prefetched)}`
      : "";

  const system = chatSystemPrompt(
    c.get("user").language,
    c.get("user").district,
    prefetchedContext,
    mode,
  );
  const answerSystem = chatAnswerSystemPrompt(
    c.get("user").language,
    c.get("user").district,
    prefetchedContext,
    mode,
  );

  // Phase 1: retrieval. Tools are available until the budget or until the
  // model stops calling them; the phase's own text is never shown or stored.
  const toolPhase = streamText({
    model: chatModel(c.env),
    system,
    messages,
    tools: buildTools(c.env, origin),
    // OpenRouter wants reasoning opted in per request. `providerOptions` keys
    // the provider does not recognize are forwarded into the request body, so
    // this becomes `reasoning: { enabled: true, max_tokens: 1024 }`.
    providerOptions: {
      openrouter: { reasoning: { enabled: true, max_tokens: 1024 } },
    },
    stopWhen: stepCountIs(TOOL_STEP_BUDGET),
    // Narrow the tool set after the first step so the model commits, and force
    // the required cite on the last step so the sources row is never empty.
    prepareStep: ({ stepNumber, steps }) => {
      const cited = steps.some((step) =>
        step.toolCalls.some((call) => call.toolName === "cite"),
      );
      if (stepNumber >= CITE_STEP && !cited) {
        return {
          toolChoice: { type: "tool" as const, toolName: "cite" },
          activeTools: ["cite"],
        };
      }
      if (stepNumber >= 1) {
        return {
          activeTools: [
            ...(mode === "research" ? RESEARCH_REFINEMENT_TOOLS : REFINEMENT_TOOLS),
          ],
        };
      }
      // Step 0 otherwise gets the full unrestricted tool set, so research
      // mode needs its own first-step restriction to keep find_lawyers out.
      if (mode === "research") return { activeTools: [...RESEARCH_TOOLS] };
      return undefined;
    },
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // The title depends only on the user's query. Start it now so its
      // latency overlaps the tool phase instead of delaying the answer phase.
      const titlePromise = isFirstMessage
        ? generateTitle(c.env, userMessage.content)
        : null;

      // Stream tool calls live, but drop the phase's text and reasoning: the
      // model narrates its plan and reasons about its tools while working, and
      // none of that belongs in the bubble or in the answer's context.
      await pipePhase(
        writer,
        toolPhase.toUIMessageStream({ sendReasoning: false, sendFinish: false }),
        false,
      );

      if (titlePromise) {
        const title = await titlePromise;
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
      }

      // Phase 2: the only text that can become the answer, generated with no
      // tools. A tools-off generation cannot resolve a retrieval urge by
      // emitting a tool-call block, so it can only produce prose. A repair
      // attempt runs only if the first produced nothing usable. Reasoning is
      // generated but never sent: the chain-of-thought deliberates about
      // instructions and tools, which must not reach the user.
      //
      // `result.response` is the final step only, so the conversation to hand
      // over is every step's generated messages concatenated; using it alone
      // would drop the earlier tool calls and their results. `workingTranscript`
      // strips the model's reasoning and narration from those messages.
      const toolSteps = await toolPhase.steps;
      // A step the provider ended on a non-executable finish reason (e.g.
      // truncated output) silently drops its pending tool calls: the client
      // already rendered them, but no result will ever arrive. Settle each one
      // on the stream so its spinner stops, and keep it out of persistence —
      // sending a tool call with no result back to the provider breaks the
      // next turn.
      const allCalls = toolSteps.flatMap((step) => step.toolCalls);
      const allResults = toolSteps.flatMap((step) => step.toolResults);
      const resultIds = new Set(allResults.map((result) => result.toolCallId));
      for (const call of allCalls) {
        if (resultIds.has(call.toolCallId)) continue;
        writer.write({
          type: "tool-output-error",
          toolCallId: call.toolCallId,
          errorText: "The tool call did not finish.",
        });
      }
      const completedCalls = allCalls.filter((call) => resultIds.has(call.toolCallId));

      const phaseOneMessages = workingTranscript(
        toolSteps.flatMap((step) => step.response.messages),
      );
      const answerPhases: Array<ReturnType<typeof streamText>> = [];
      let answerText = "";
      for (let attempt = 0; attempt < MAX_ANSWER_ATTEMPTS && !answerText; attempt += 1) {
        const answerPhase = streamText({
          model: chatModel(c.env),
          system: answerSystem,
          // `response.messages` holds only the generated assistant/tool
          // messages, not the input, so the original conversation and the
          // closing instruction are added back here.
          messages: [
            ...messages,
            ...phaseOneMessages,
            {
              role: "user",
              content:
                attempt === 0
                  ? FINAL_ANSWER_INSTRUCTION
                  : `${FINAL_ANSWER_INSTRUCTION} ${ANSWER_REPAIR_INSTRUCTION}`,
            },
          ],
          providerOptions: {
            openrouter: { reasoning: { enabled: true, max_tokens: 1024 } },
          },
        });
        answerPhases.push(answerPhase);
        await pipePhase(
          writer,
          answerPhase.toUIMessageStream({
            sendReasoning: false,
            sendStart: false,
            sendFinish: false,
          }),
          true,
        );
        answerText = stripToolCallText(await answerPhase.text);
      }
      // Every sub-stream suppressed finish so the single message closes only
      // once, after all phases including a repair attempt.
      writer.write({ type: "finish" });

      const answerSteps = (
        await Promise.all(answerPhases.map((phase) => phase.steps))
      ).flat();
      // Temporary diagnostics: a turn that ends without prose needs the
      // per-step finish reasons and sizes to locate the failing phase. Logged
      // at error level so the observability store captures it.
      console.error(
        "[chat] tool phase steps",
        JSON.stringify(
          toolSteps.map((step) => ({
            finish: step.finishReason,
            text: step.text.length,
            reasoning: step.reasoningText?.length ?? 0,
            tools: step.toolCalls.map((call) => call.toolName),
          })),
        ),
      );
      console.error(
        "[chat] answer phase steps",
        JSON.stringify(
          answerSteps.map((step) => ({
            finish: step.finishReason,
            text: step.text.length,
            reasoning: step.reasoningText?.length ?? 0,
          })),
        ),
      );

      // Tool calls live in the step that invoked them, so aggregate across the
      // tool phase's steps. `completedCalls` excludes calls dropped above.
      const toolCalls: TToolCall[] = completedCalls.map((call) => ({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        input: call.input,
      }));
      const toolResults: TToolResult[] = allResults.map((toolResult) => ({
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
        output: toolResult.output,
      }));
      // The model reasons before each tool call and again while composing the
      // answer; join every phase's blocks into the single trace the panel shows.
      const reasoning =
        [...toolSteps, ...answerSteps]
          .map((step) => step.reasoningText)
          .filter((text): text is string => Boolean(text?.trim()))
          .join("\n\n") || null;
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
      // Leaked-cite salvage still applies if the model wrote the call as text
      // instead of invoking the tool (e.g. the provider ignored the tool).
      const toolText = toolSteps.map((step) => step.text).join("");
      const leakedCiteIds =
        references === null ? extractLeakedCiteNodeIds(toolText) : [];
      const metrics = await Promise.all([
        toolPhase.totalUsage,
        ...answerPhases.map((phase) => phase.totalUsage),
      ]);
      const usage = metrics.reduce<{ input: number; output: number }>(
        (total, item) => ({
          input: total.input + (item.inputTokens ?? 0),
          output: total.output + (item.outputTokens ?? 0),
        }),
        { input: 0, output: 0 },
      );
      // Context can tear down once the last chunk flushes; waitUntil keeps the
      // isolate alive for these writes.
      c.executionCtx.waitUntil(
        (async () => {
          const now = new Date().toISOString();
          let resolvedReferences = references;
          const fallbackIds =
            references === null && leakedCiteIds.length === 0
              ? readNodeIds(toolResults)
              : [];
          const citeIds = leakedCiteIds.length > 0 ? leakedCiteIds : fallbackIds;
          if (resolvedReferences === null && citeIds.length > 0) {
            const resolved = await resolveReferences(db, citeIds);
            if (resolved.length > 0) resolvedReferences = resolved;
          }
          await insertAssistantMessage(
            db,
            session.id,
            answerText,
            toolCalls.length > 0 ? toolCalls : null,
            toolResults.length > 0 ? toolResults : null,
            resolvedReferences,
            reasoning,
          );
          await touchSession(db, session.id, { updatedAt: now });
          await addUsage(db, session.userId, usage.input + usage.output);
        })(),
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
});
