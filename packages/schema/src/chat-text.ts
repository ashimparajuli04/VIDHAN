// Some models, when a tool call cannot be made natively (e.g. the provider has
// tools disabled), write the call into the answer text as markup instead of
// prose. Left alone it renders verbatim in the chat bubble. These helpers strip
// that markup and salvage a leaked `cite` call's nodeIds so the citation still
// resolves.

const TOOL_CALL_BLOCK =
  /<(?:tool_calls|function_calls)\b[^>]*>[\s\S]*?<\/(?:tool_calls|function_calls)>/gi;
const INVOKE_BLOCK = /<invoke\b[^>]*>[\s\S]*?<\/invoke>/gi;
const CITE_BLOCK = /<cite\b[^>]*>[\s\S]*?<\/cite>/gi;
const SELF_CLOSING_TAG = /<(?:cite|function|tool)\b[^>]*?\/>/gi;

export function stripToolCallText(text: string): string {
  return text
    .replace(TOOL_CALL_BLOCK, "")
    .replace(INVOKE_BLOCK, "")
    .replace(CITE_BLOCK, "")
    .replace(SELF_CLOSING_TAG, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractLeakedCiteNodeIds(text: string): string[] {
  const ids: string[] = [];

  const invoke = /<invoke\s+name="cite"[^>]*>([\s\S]*?)<\/invoke>/gi;
  for (const match of text.matchAll(invoke)) {
    const param = /<parameter\s+name="nodeIds"[^>]*>([\s\S]*?)<\/parameter>/i.exec(
      match[1] ?? "",
    );
    if (param) ids.push(...parseNodeIds(param[1] ?? ""));
  }

  const selfClosing = /<cite\b[^>]*\bnodeIds="([^"]*)"/gi;
  for (const match of text.matchAll(selfClosing)) {
    ids.push(...parseNodeIds(match[1] ?? ""));
  }

  return ids;
}

function parseNodeIds(raw: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }
  return value
    .split(",")
    .map((id) => id.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}
