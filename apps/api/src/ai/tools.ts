import { tool } from "ai";
import { z } from "zod/v4";
import {
  DOCUMENT_TYPES,
  DISTRICTS,
  LANGUAGES,
  PRACTICE_AREAS,
  SUPPORT_TICKET_CATEGORIES,
  ZCiteOutput,
} from "@vidhan/schema";
import { createDb } from "../db";
import { searchLawyers, type TLawyerSearchResult } from "../lawyers";
import { listDocuments, listDocumentTitles } from "../documents/list";
import {
  DEFAULT_OUTLINE_LIMIT,
  DEFAULT_SECTION_MAX_CHARS,
  getBoundedSection,
  getCompactOutline,
  getDocumentSummary,
  getSections,
  resolveReferences,
  searchDocumentSections,
} from "../documents/retrieval";
import type { TSectionText } from "../documents/retrieval";
import type { Env } from "../index";

export type TCiteResult = z.infer<typeof ZCiteOutput>;

export type TFindLawyersInput = {
  practiceAreas: (typeof PRACTICE_AREAS)[number][];
  district?: (typeof DISTRICTS)[number];
  language?: (typeof LANGUAGES)[number];
  reason: string;
};

export function buildTools(env: Env, origin: string) {
  return {
    find_lawyers: tool({
      description:
        "Find Nepali lawyers matching the user's legal issue. Call when the user needs " +
        "a human lawyer. Returns up to 5 lawyers; when none match the district, the " +
        "result's meta.districtCounts lists districts that do, so you can suggest nearby ones.",
      inputSchema: z.object({
        practiceAreas: z
          .array(z.enum(PRACTICE_AREAS))
          .min(1)
          .describe("Legal practice areas relevant to the issue"),
        district: z.enum(DISTRICTS).optional().describe("Preferred district, when known"),
        language: z
          .enum(LANGUAGES)
          .optional()
          .describe("Language the lawyer should speak, when relevant"),
        reason: z.string().describe("One sentence on why these filters fit the user's issue"),
      }),
      execute: async (input): Promise<TLawyerSearchResult> => {
        const db = createDb(env.DB);
        return searchLawyers(
          db,
          {
            practiceAreas: input.practiceAreas,
            districts: input.district ? [input.district] : [],
            languages: input.language ? [input.language] : [],
            limit: 5,
            offset: 0,
          },
          env,
          origin,
        );
      },
    }),

    list_documents: tool({
      description:
        "List the legal documents available in the corpus. Call first when you need to " +
        "know which statutes exist before picking one.",
      inputSchema: z.object({}),
      execute: async () => {
        const db = createDb(env.DB);
        const docs = await listDocumentTitles(db);
        return {
          documents: docs.map((doc) => ({
            id: doc.id,
            title: doc.title,
            documentType: doc.documentType,
          })),
        };
      },
    }),

    // Primary discovery step: titles are enough for the model to shortlist the
    // likely statute without relying on lexical matching.
    get_document_titles: tool({
      description:
        "List every legal document in the corpus by title and id. Start here: read " +
        "the titles and pick the one most likely to contain the provision. Prefer " +
        "this over keyword search when the user's topic may map to a differently " +
        "worded or non-English statute.",
      inputSchema: z.object({}),
      execute: async () => {
        const db = createDb(env.DB);
        const docs = await listDocumentTitles(db);
        return {
          documents: docs.map((doc) => ({
            id: doc.id,
            title: doc.title,
            documentType: doc.documentType,
          })),
        };
      },
    }),

    // Second discovery step: a stored parts brief plus an index of every section
    // id, so the model can confirm relevance and pick the exact sections to read.
    get_document_summary: tool({
      description:
        "Fetch a document's parts brief — a lead line and what each part covers — " +
        "and the id + heading of every section. Use after get_document_titles to " +
        "confirm the document covers the topic, then pass the relevant section " +
        "nodeIds to get_sections.",
      inputSchema: z.object({
        documentId: z.string().describe("Document id from get_document_titles"),
      }),
      execute: async ({ documentId }) => {
        const db = createDb(env.DB);
        const summary = await getDocumentSummary(db, documentId);
        if (!summary) return { error: "not_found", documentId };
        return summary;
      },
    }),

    // Batch reader: several section bodies in one call. This is the preferred
    // way to read provisions, replacing one-get_section-per-provision.
    get_sections: tool({
      description:
        "Fetch several sections' text and canonical citations by node id in one " +
        "call. Pass every nodeId you want to read. Bodies are capped; if truncated " +
        "is true the content continues. Cite the returned citation verbatim.",
      inputSchema: z.object({
        documentId: z.string(),
        nodeIds: z
          .array(z.string())
          .min(1)
          .describe("Node ids from get_document_summary or get_document_outline"),
        maxChars: z
          .number()
          .int()
          .min(500)
          .max(20000)
          .optional()
          .describe("Per-section character cap; defaults to 6000"),
      }),
      execute: async ({ documentId, nodeIds, maxChars }) => {
        const db = createDb(env.DB);
        const sections = await getSections(
          db,
          documentId,
          nodeIds,
          maxChars ?? DEFAULT_SECTION_MAX_CHARS,
        );
        return {
          sections,
          requested: nodeIds.length,
          returned: sections.length,
        };
      },
    }),

    search_documents: tool({
      description:
        "Search legal documents by keywords in the title or summary. Use when the user " +
        "names an act or topic; returns matching documents with ids.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Keywords, e.g. 'domestic violence' or 'labour'"),
        type: z
          .enum(DOCUMENT_TYPES)
          .optional()
          .describe("Filter by document type when the user specifies one"),
      }),
      execute: async ({ query, type }) => {
        const db = createDb(env.DB);
        const result = await listDocuments(db, { page: 1, limit: 10, search: query, type });
        return {
          documents: result.documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            documentType: doc.documentType,
          })),
          total: result.total,
        };
      },
    }),

    get_document_outline: tool({
      description:
        "List a document's sections (id, number, heading, chapter) so you can pick " +
        "which to read. Pass query to filter by heading (e.g. 'complaint', 'limitation') — " +
        "large statutes are capped, so filter rather than paging. Bodies are not included.",
      inputSchema: z.object({
        documentId: z.string().describe("Document id from list_documents/search_documents"),
        query: z
          .string()
          .optional()
          .describe("Filter sections whose heading contains this text"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max sections to return"),
      }),
      execute: async ({ documentId, query, limit }) => {
        const db = createDb(env.DB);
        const outline = await getCompactOutline(db, documentId, {
          query,
          limit: limit ?? DEFAULT_OUTLINE_LIMIT,
        });
        if (!outline) return { error: "not_found", documentId };
        return outline;
      },
    }),

    // One-shot ranked search. Prefer this over outline-then-read for a
    // topic question — it returns the sections whose text itself matches.
    search_document_sections: tool({
      description:
        "Rank a document's sections by keyword match against their text, returning " +
        "snippets and node ids. Use to jump straight to relevant provisions instead " +
        "of walking the outline.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Keywords from the user's question"),
        limit: z.number().int().min(1).max(20).optional().describe("Max sections"),
      }),
      execute: async ({ query, limit }) => {
        const db = createDb(env.DB);
        const matches = await searchDocumentSections(db, query, limit ?? 8);
        return { matches, total: matches.length };
      },
    }),

    get_section: tool({
      description:
        "Fetch one section's text and canonical citation by node id. The body is " +
        "capped; if truncated is true, the content continues beyond what is shown. " +
        "Cite the returned citation verbatim.",
      inputSchema: z.object({
        documentId: z.string(),
        nodeId: z.string().describe("Node id from get_document_outline or search_document_sections"),
        maxChars: z
          .number()
          .int()
          .min(500)
          .max(20000)
          .optional()
          .describe("Cap on returned characters; defaults to 6000"),
      }),
      execute: async ({ documentId, nodeId, maxChars }) => {
        const db = createDb(env.DB);
        const section = await getBoundedSection(
          db,
          documentId,
          nodeId,
          maxChars ?? DEFAULT_SECTION_MAX_CHARS,
        );
        if (!section) return { error: "not_found", documentId, nodeId };
        return section;
      },
    }),

    // Consent-gated: the execute is a no-op, and nothing is written until the
    // client's offer card calls POST /support/tickets. Auto-filing on the
    // model's judgement would let a hallucinated miss spam the admin queue.
    offer_support_ticket: tool({
      description:
        "Offer to file a support ticket with the team. Call when you cannot find " +
        "a relevant provision, when find_lawyers returned no lawyers, or when the " +
        "user directly asks you to file a ticket (including app issues unrelated " +
        "to the law). This only shows the user an offer they must click; it does " +
        "not create the ticket.",
      inputSchema: z.object({
        category: z
          .enum(SUPPORT_TICKET_CATEGORIES)
          .describe(
            "missing_document when a provision was not found, missing_lawyer " +
              "when no lawyer was found, other otherwise — including a direct " +
              "request to file a ticket",
          ),
        message: z
          .string()
          .describe(
            "The ticket body an admin will read. Write it as the user's problem " +
              "in full: what they asked, what was missing, and what they need. " +
              "Name the topic and district where relevant; do not just repeat the " +
              "raw question.",
          ),
        reason: z
          .string()
          .describe("One short sentence shown on the offer card"),
      }),
      execute: async ({ category }) => ({ offered: true, category }),
    }),

    // Records the provisions the answer actually relied on, once, before the
    // final text. Side-effect only — the refs render as the cited-sources row.
    cite: tool({
      description:
        "Record the sections your answer relied on, so they can be shown as cited " +
        "sources. Call exactly once, after reading the sections and before writing " +
        "your final answer, passing every nodeId you used. Pass no ids if you used none.",
      inputSchema: z.object({
        nodeIds: z
          .array(z.string())
          .describe("Every node id you relied on, in the order you used them"),
      }),
      execute: async ({ nodeIds }) => {
        const db = createDb(env.DB);
        const references = await resolveReferences(db, nodeIds);
        return { references } satisfies TCiteResult;
      },
    }),
  };
}

export type TToolSet = ReturnType<typeof buildTools>;

// Deterministic first pass: rank the whole corpus by the user's question and
// hand back the best sections' text, so the model can answer common
// topic questions without a list→search→outline→read tool chain. The tools
// stay available for anything the prefetch misses.
export async function prefetchSections(
  env: Env,
  question: string,
  limit = 5,
): Promise<TSectionText[]> {
  const db = createDb(env.DB);
  const matches = await searchDocumentSections(db, question, limit);
  const seen = new Set<string>();
  const sections: TSectionText[] = [];
  for (const match of matches) {
    if (seen.has(match.nodeId)) continue;
    seen.add(match.nodeId);
    const section = await getBoundedSection(
      db,
      match.documentId,
      match.nodeId,
      DEFAULT_SECTION_MAX_CHARS,
    );
    if (section) sections.push(section);
  }
  return sections;
}

export function renderPrefetchedContext(sections: TSectionText[]): string {
  return sections
    .map((section) =>
      [
        `### ${section.documentTitle} — ${section.identifier}${
          section.heading ? ` (${section.heading})` : ""
        }`,
        section.citation ? `Citation: ${section.citation}` : "",
        `nodeId: ${section.nodeId}`,
        section.content,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}
