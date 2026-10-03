// Deterministic text cleanup for `document_nodes`. Does all structural and
// formatting work; the LLM pass (llm.ts) only proposes surgical find/replace
// repairs. The title-tail fold is the load-bearing part: the converter stored
// `"Assets not to Be Laundered: (1) Nobody shall launder..."` whole in `title`,
// derived `heading` from the pre-colon part, and left the tail out of
// `content`, so the reader silently dropped clause (1).

/** Container nodes have no body and keep `heading = null`; never folded. */
export const CONTAINER_NODE_TYPES: readonly string[] = [
  "preamble",
  "chapter",
  "section_group",
];

export interface TNormalizeInput {
  nodeType: string;
  title: string;
  heading: string | null;
  content: string | null;
  /** The owning document's title, used to strip the repeated capture header. */
  documentTitle: string;
}

export interface TNormalizeResult {
  title: string;
  heading: string | null;
  content: string | null;
  /** True when a non-empty title tail was moved into `content`. */
  folded: boolean;
  /** Artifact lines dropped from `content` (page counters, footers, headers). */
  artifactsRemoved: number;
  changed: boolean;
}

// Extraction noise. Each pattern matches a whole line, so it cannot eat into a
// provision: page counters ("2/25", "7"), site footers, the date/title capture
// header the scraper repeats on every page, and the nav marker.
const CAPTURE_HEADER_LINE =
  /^\s*\d{1,2}\/\d{1,2}\/\d{4}\s+.*?[–—-]\s*Nepal Law Commission\s*$/gm;
const URL_FOOTER_LINE =
  /^\s*https?:\/\/\S+(?:\s+\d{1,4}(?:\s*\/\s*\d{1,4})?)?\s*$/gm;
const SITE_FOOTER_LINE =
  /^\s*www\.lawcommission\.gov\.np(?:\s+\d{1,4})?\s*$/gim;
const PAGE_NUMBER_LINE = /^\s*(?:\d{1,4}|\d{1,4}\s*\/\s*\d{1,4})\s*$/gm;
const NAV_LINE = /^\s*(?:MENU|NEPAL LAW COMMISSION)\s*$/gim;

// `\s` plus the exotic spaces/joiners extraction emits. Used for the loss
// fingerprint, where only the non-whitespace character stream matters.
const WHITESPACE = /[\s\u00A0\u2007\u202F\u200B\u200C\u200D\uFEFF]+/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface TStripped {
  text: string;
  removed: number;
}

// Line-anchored artifact removal only; whitespace shaping is separate so the
// loss fingerprint can apply the same removals to the raw and cleaned text.
function stripArtifacts(text: string, documentTitle: string): TStripped {
  let removed = 0;
  const apply = (re: RegExp, value: string): string => {
    removed += value.match(re)?.length ?? 0;
    return value.replace(re, "");
  };

  let result = apply(CAPTURE_HEADER_LINE, text);
  result = apply(URL_FOOTER_LINE, result);
  result = apply(SITE_FOOTER_LINE, result);
  result = apply(PAGE_NUMBER_LINE, result);
  result = apply(NAV_LINE, result);

  const title = documentTitle.trim();
  if (title.length >= 8) {
    result = apply(new RegExp(`^\\s*${escapeRegExp(title)}\\s*$`, "gm"), result);
  }
  return { text: result, removed };
}

function nonWhitespace(text: string): string {
  return text.replace(WHITESPACE, "");
}

// Put line-initial numeric clause markers in their own paragraph. Inline
// references ("sub-section (2) of section 5") are not at line start, so they
// are untouched.
function shapeMarkdown(text: string): string {
  return text.replace(/(\S)\n(?=\(\d+\))/g, "$1\n\n");
}

// Whitespace shaping after the fold: the tail is already part of `content`, so
// artifact lines must be stripped before this runs (a page number that ends up
// glued to the tail would otherwise survive).
function finishContent(value: string): string {
  return shapeMarkdown(
    value
      .replace(/[\u00A0\u2007\u202F]/g, " ")
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

// The tail ran into the title without a separating space, so rejoin it with
// one; trimming `content` first keeps the join single-spaced.
function joinTail(tail: string, content: string | null): string | null {
  if (!tail) return content;
  const body = content?.trim() ?? "";
  return body ? `${tail} ${body}` : tail;
}

export function normalizeNode(input: TNormalizeInput): TNormalizeResult {
  const isContainer = CONTAINER_NODE_TYPES.includes(input.nodeType);
  let title = input.title;
  let content = input.content;
  let folded = false;
  let artifactsRemoved = 0;

  if (content !== null) {
    const stripped = stripArtifacts(content.replace(/\r\n?/g, "\n"), input.documentTitle);
    content = stripped.text;
    artifactsRemoved = stripped.removed;
  }

  if (isContainer) {
    title = title.trim();
  } else {
    const sep = title.search(/[:\n]/);
    if (sep >= 0) {
      const pre = title.slice(0, sep).trim();
      const tail = title.slice(sep + 1).trim();
      title = pre;
      content = joinTail(tail, content);
      folded = tail.length > 0;
    } else {
      title = title.trim();
    }
  }

  if (content !== null) content = finishContent(content);

  // `heading` is deliberately unchanged: it already holds the pre-separator
  // text, and `citation` keys off it, so preserving it keeps citations valid.
  const heading = isContainer ? null : input.heading;
  const changed = title !== input.title || content !== input.content;
  return { title, heading, content, folded, artifactsRemoved, changed };
}

// Loss fingerprint: the non-whitespace character stream with the known
// normalizations erased (artifact lines, the fold's first separator). The title
// and content are stripped separately because that is the order normalize uses,
// and applying it to the raw and cleaned node must yield the same string; any
// difference is text lost without an edit and reverts the node.
export function conservationKey(
  title: string,
  content: string | null,
  documentTitle: string,
): string {
  const unfolded = title.replace(/[:\n]/, " ");
  const titlePart = stripArtifacts(unfolded, documentTitle).text;
  const contentPart = stripArtifacts(
    (content ?? "").replace(/\r\n?/g, "\n"),
    documentTitle,
  ).text;
  return nonWhitespace(titlePart + contentPart);
}

export function isContentNode(nodeType: string): boolean {
  return !CONTAINER_NODE_TYPES.includes(nodeType);
}
