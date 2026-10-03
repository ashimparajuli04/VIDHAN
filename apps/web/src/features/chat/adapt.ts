import type { ChatStatus, UIMessage } from "ai";
import {
  SUPPORT_TICKET_CATEGORIES,
  ZCiteOutput,
  ZPublicLawyer,
} from "@vidhan/schema";
import type {
  TChatMessage,
  TPublicLawyer,
  TReference,
  TSupportTicketCategory,
} from "@vidhan/schema";

import type {
  TChatMessageView,
  TLawyerSearch,
  TSourceStep,
  TStreamStatus,
  TSupportOffer,
} from "./types";

const TOOL_NAME = "find_lawyers";
const CITE_TOOL_NAME = "cite";
const OFFER_TOOL_NAME = "offer_support_ticket";

const RETRIEVAL_TOOLS = [
  "list_documents",
  "search_documents",
  "search_document_sections",
  "get_document_outline",
  "get_section",
] as const;

const RETRIEVAL_LABELS: Record<(typeof RETRIEVAL_TOOLS)[number], string> = {
  list_documents: "Listing legal documents",
  search_documents: "Searching the legal corpus",
  search_document_sections: "Searching the legal corpus",
  get_document_outline: "Reading document outline",
  get_section: "Reading a section",
};

type TToolPart = {
  toolName: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input: unknown;
  output: unknown;
};

// No client tool definitions are passed to useChat, so a server-executed tool
// can arrive either as a `dynamic-tool` part or, in AI SDK v5, as a *static*
// `tool-<name>` part (`dynamic` is only set for `dynamicTool()`). Accept both.
function asToolPart(part: UIMessage["parts"][number]): TToolPart | null {
  if (part.type === "dynamic-tool") {
    return {
      toolName: part.toolName,
      state: part.state,
      input: part.input,
      output: part.state === "output-available" ? part.output : undefined,
    };
  }
  if (part.type.startsWith("tool-")) {
    const tool = part as {
      type: string;
      state: TToolPart["state"];
      input: unknown;
      output?: unknown;
    };
    return {
      toolName: part.type.slice("tool-".length),
      state: tool.state,
      input: tool.input,
      output: tool.state === "output-available" ? tool.output : undefined,
    };
  }
  return null;
}

function extractLawyers(output: unknown): TPublicLawyer[] {
  if (!output || typeof output !== "object") return [];
  const lawyers = (output as { lawyers?: unknown }).lawyers;
  if (!Array.isArray(lawyers)) return [];
  return lawyers.flatMap((item) => {
    const parsed = ZPublicLawyer.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function formatQuery(input: unknown): string {
  if (input === undefined) return `${TOOL_NAME}(…)`;
  return `${TOOL_NAME}(${JSON.stringify(input)})`;
}

function toLawyerSearch(tool: TToolPart): TLawyerSearch {
  const done = tool.state === "output-available";
  return {
    query: formatQuery(tool.input),
    lawyers: done ? extractLawyers(tool.output) : [],
    state: tool.state === "output-error" ? "error" : done ? "done" : "pending",
  };
}

function isRetrievalTool(name: string): name is (typeof RETRIEVAL_TOOLS)[number] {
  return (RETRIEVAL_TOOLS as readonly string[]).includes(name);
}

function titleOf(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return undefined;
  const record = output as { heading?: unknown; title?: unknown };
  const value = record.heading ?? record.title;
  return typeof value === "string" ? value : undefined;
}

// Ordered, deduped retrieval steps. One tool call streams under a single
// toolCallId, so map by id and let the latest state win.
function extractSources(message: UIMessage): TSourceStep[] | undefined {
  const steps: TSourceStep[] = [];
  const index = new Map<string, number>();
  for (const part of message.parts) {
    const tool = asToolPart(part);
    if (!tool || !isRetrievalTool(tool.toolName)) continue;

    const step: TSourceStep = {
      id: "toolCallId" in part ? (part.toolCallId as string) : tool.toolName,
      label: RETRIEVAL_LABELS[tool.toolName],
      running: tool.state !== "output-available",
    };
    if (tool.toolName === "get_section") step.title = titleOf(tool.output);

    const at = index.get(step.id);
    if (at === undefined) {
      index.set(step.id, steps.length);
      steps.push(step);
    } else {
      steps[at] = step;
    }
  }
  return steps.length > 0 ? steps : undefined;
}

function extractReferences(output: unknown): TReference[] | undefined {
  const parsed = ZCiteOutput.safeParse(output);
  return parsed.success && parsed.data.references.length > 0
    ? parsed.data.references
    : undefined;
}

function isSupportCategory(value: unknown): value is TSupportTicketCategory {
  return (SUPPORT_TICKET_CATEGORIES as readonly string[]).includes(value as string);
}

// The offer body is the user query the ticket is filed from; the tool's own
// input only carries category + reason. Read the input off the tool part.
function toSupportOffer(input: unknown, query: string): TSupportOffer | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as { category?: unknown; reason?: unknown };
  if (!isSupportCategory(record.category)) return undefined;
  return {
    category: record.category,
    reason: typeof record.reason === "string" ? record.reason : "",
    query,
  };
}

export function toMessageView(
  message: UIMessage,
  precedingUserText = ""
): TChatMessageView {
  const content = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  const view: TChatMessageView = {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content,
  };

  for (const part of message.parts) {
    const tool = asToolPart(part);
    if (tool?.toolName === CITE_TOOL_NAME && tool.state === "output-available") {
      view.references = extractReferences(tool.output);
    }
  }

  for (const part of message.parts) {
    const tool = asToolPart(part);
    if (tool?.toolName === TOOL_NAME) {
      view.lawyerSearch = toLawyerSearch(tool);
      break;
    }
  }

  for (const part of message.parts) {
    const tool = asToolPart(part);
    if (tool?.toolName === OFFER_TOOL_NAME && tool.state === "output-available") {
      view.supportOffer = toSupportOffer(tool.input, precedingUserText);
      break;
    }
  }

  if (message.role !== "user") {
    const sources = extractSources(message);
    if (sources) view.sources = sources;
  }

  return view;
}

function hasPendingTool(message: UIMessage): boolean {
  return message.parts.some((part) => {
    const tool = asToolPart(part);
    return tool?.toolName === TOOL_NAME && tool.state !== "output-available";
  });
}

// The assistant message is created on the first stream chunk, which for this
// backend is the step-start that precedes a tool call. Until it actually
// carries text or a tool part, keep the thinking state rather than showing an
// empty bubble while the model works or the tool runs.
function hasOutput(message: UIMessage | undefined): boolean {
  return (
    message?.parts.some(
      (part) =>
        (part.type === "text" && part.text.length > 0) ||
        asToolPart(part) !== null
    ) ?? false
  );
}

export function deriveStatus(
  status: ChatStatus,
  messages: UIMessage[]
): TStreamStatus {
  if (status === "submitted") return "thinking";
  if (status === "streaming") {
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant" || !hasOutput(last)) return "thinking";
    return hasPendingTool(last) ? "searching" : "streaming";
  }
  return "idle";
}

export function toMessageViews(
  messages: UIMessage[],
  status: TStreamStatus
): TChatMessageView[] {
  const views = messages.map((message, index) => {
    // The offer card's ticket body is the user query that prompted the turn.
    let query = "";
    for (let at = index - 1; at >= 0; at -= 1) {
      const prior = messages[at];
      if (prior?.role !== "user") continue;
      query = prior.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      break;
    }
    return toMessageView(message, query);
  });
  // The SDK appends the assistant message only when the first chunk lands, so
  // synthesize one during the submitted phase to keep the thinking dots.
  if (status === "thinking" && messages[messages.length - 1]?.role === "user") {
    views.push({ id: "__thinking", role: "assistant", content: "" });
  }
  return views;
}

export function lastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
}

export function historyToMessages(history: TChatMessage[]): UIMessage[] {
  return history.map((row) => {
    if (row.role === "user") {
      return { id: row.id, role: "user", parts: [{ type: "text", text: row.content }] };
    }

    const parts: UIMessage["parts"] = [];
    if (row.content) parts.push({ type: "text", text: row.content });

    const results = row.toolResults ?? [];
    let hasCitePart = false;
    for (const call of row.toolCalls ?? []) {
      const result = results.find((item) => item.toolCallId === call.toolCallId);
      if (call.toolName === CITE_TOOL_NAME) hasCitePart = true;
      if (result) {
        parts.push({
          type: "dynamic-tool",
          toolName: call.toolName,
          toolCallId: call.toolCallId,
          state: "output-available",
          input: call.input,
          output: result.output,
        });
      } else {
        parts.push({
          type: "dynamic-tool",
          toolName: call.toolName,
          toolCallId: call.toolCallId,
          state: "input-available",
          input: call.input,
        });
      }
    }

    // The `references` column is canonical; synthesize the cite part from it
    // when the stored tool rows predate the column or were trimmed, so one
    // extraction path (`toMessageView`) serves both live and reloaded turns.
    if (!hasCitePart && row.references && row.references.length > 0) {
      parts.push({
        type: "dynamic-tool",
        toolName: CITE_TOOL_NAME,
        toolCallId: `cite-${row.id}`,
        state: "output-available",
        input: { nodeIds: row.references.map((ref) => ref.nodeId) },
        output: { references: row.references },
      });
    }

    return { id: row.id, role: "assistant", parts };
  });
}
