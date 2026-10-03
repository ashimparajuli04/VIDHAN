import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod/v4";

export const PRACTICE_AREAS = [
  "criminal", "civil", "family", "property", "consumer", "labor",
  "corporate", "immigration", "tax", "constitutional", "cyber",
  "banking", "human_rights", "other",
] as const;

export const LANGUAGES = ["en", "ne", "roman_ne"] as const;

// Willingness to be reached for a consultation; courts mirrors the
// tiers of Nepal's judiciary (Supreme → High → District, plus special
// courts and tribunals).
export const CONSULTATION_MODES = ["in_person", "phone", "video"] as const;
export const COURTS = [
  "supreme_court",
  "high_court",
  "district_court",
  "special_courts",
  "tribunals",
] as const;

export const ZLawyerEducation = z.object({
  degree: z.string().min(1).max(120),
  institution: z.string().min(1).max(160),
  year: z.number().int().min(1950).max(2030).optional(),
});
export type TLawyerEducation = z.infer<typeof ZLawyerEducation>;

export const DISTRICTS = [
  "bhojpur", "dhankuta", "ilam", "jhapa", "khotang", "morang",
  "okhaldhunga", "panchthar", "sankhuwasabha", "solukhumbu", "sunsari",
  "taplejung", "terhathum", "udayapur",
  "bara", "dhanusha", "mahottari", "parsa", "rautahat", "saptari",
  "sarlahi", "siraha",
  "bhaktapur", "chitwan", "dhading", "dolakha", "kathmandu",
  "kavrepalanchok", "lalitpur", "makwanpur", "nuwakot", "ramechhap",
  "rasuwa", "sindhuli", "sindhupalchok",
  "baglung", "gorkha", "kaski", "lamjung", "manang", "mustang", "myagdi",
  "nawalpur", "parbat", "syangja", "tanahun",
  "arghakhanchi", "banke", "bardiya", "dang", "gulmi", "kapilvastu",
  "parasi", "palpa", "pyuthan", "rolpa", "eastern_rukum", "rupandehi",
  "dailekh", "dolpa", "humla", "jajarkot", "jumla", "kalikot", "mugu",
  "salyan", "surkhet", "western_rukum",
  "achham", "baitadi", "bajhang", "bajura", "dadeldhura", "darchula",
  "doti", "kailali", "kanchanpur",
] as const;

export type TPracticeArea = (typeof PRACTICE_AREAS)[number];
export type TLanguage = (typeof LANGUAGES)[number];
export type TDistrict = (typeof DISTRICTS)[number];
export type TConsultationMode = (typeof CONSULTATION_MODES)[number];
export type TCourt = (typeof COURTS)[number];

export const lawyers = sqliteTable(
  "lawyers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    practiceAreas: text("practice_areas", { mode: "json" })
      .$type<(typeof PRACTICE_AREAS)[number][]>()
      .notNull(),
    district: text("district").notNull(),
    languages: text("languages", { mode: "json" })
      .$type<(typeof LANGUAGES)[number][]>()
      .notNull(),
    bookingUrl: text("booking_url"),
    barNumber: text("bar_number"),
    yearsOfExperience: integer("years_of_experience"),
    bio: text("bio"),
    imageKey: text("image_key"),
    firmName: text("firm_name"),
    // NPR; null = fee not listed
    consultationFee: integer("consultation_fee"),
    freeFirstConsultation: integer("free_first_consultation", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    consultationModes: text("consultation_modes", { mode: "json" })
      .$type<TConsultationMode[]>(),
    courts: text("courts", { mode: "json" }).$type<TCourt[]>(),
    education: text("education", { mode: "json" })
      .$type<TLawyerEducation[]>(),
    barEnrollmentYear: integer("bar_enrollment_year"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("lawyers_practice_district_idx").on(t.practiceAreas, t.district),
    uniqueIndex("lawyers_bar_number_unique").on(t.barNumber),
  ],
);

export const DOCUMENT_TYPES = ["act", "constitution", "regulation"] as const;
export type TDocumentType = (typeof DOCUMENT_TYPES)[number];

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    documentType: text("document_type", { enum: DOCUMENT_TYPES }).notNull(),
    yearBs: integer("year_bs"),
    yearAd: integer("year_ad"),
    totalPages: integer("total_pages"),
    sourceFilename: text("source_filename").notNull(),
    // Populated later by an LLM + admin action; never generated at ingest.
    summary: text("summary"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("documents_type_idx").on(t.documentType),
    index("documents_title_idx").on(t.title),
  ],
);

export const DOCUMENT_NODE_TYPES = [
  "preamble",
  "part",
  "chapter",
  "section_group",
  "section",
  "sub_section",
  "clause",
  "schedule",
] as const;
export type TDocumentNodeType = (typeof DOCUMENT_NODE_TYPES)[number];

// Normalized recursive tree. `id` is the path id `{documentId}:{0.2.1}` where
// each segment is the node's 0-based position within its parent. Citations are
// precomputed at ingest so retrieval never reconstructs them.
export const documentNodes = sqliteTable(
  "document_nodes",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    parentId: text("parent_id").references((): AnySQLiteColumn => documentNodes.id),
    depth: integer("depth").notNull(),
    nodeType: text("node_type", { enum: DOCUMENT_NODE_TYPES }).notNull(),
    identifier: text("identifier").notNull(),
    title: text("title").notNull(),
    heading: text("heading"),
    content: text("content"),
    position: integer("position").notNull(),
    citation: text("citation"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("document_nodes_doc_position_idx").on(t.documentId, t.position),
    index("document_nodes_doc_parent_idx").on(t.documentId, t.parentId),
    index("document_nodes_doc_type_idx").on(t.documentId, t.nodeType),
  ],
);

export const CHAT_ROLES = ["user", "assistant"] as const;

declare const jsonDataType: unique symbol;
type JsonValueOf<T> = { [jsonDataType]: T };

// `$type` changes only the select type; inserts still demand the branded payload.
export function asJson<T>(value: T[]): T[] & JsonValueOf<T[]> {
  return value as T[] & JsonValueOf<T[]>;
}

export const ZToolCall = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});

export const ZToolResult = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  output: z.unknown(),
});

// A provision the model says it relied on, resolved to display metadata at
// `cite` time. `citation` mirrors the nullable document_nodes column.
export const ZReference = z.object({
  documentId: z.string(),
  nodeId: z.string(),
  identifier: z.string(),
  heading: z.string(),
  citation: z.string().nullable(),
});

// `cite` tool output. Shared so the client validates the shape the server writes.
export const ZCiteOutput = z.object({ references: z.array(ZReference) });

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    district: text("district"),
    isResearcher: integer("is_researcher", { mode: "boolean" })
      .notNull()
      .default(false),
    language: text("language").notNull().default("en"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("chat_sessions_user_updated_idx").on(t.userId, t.updatedAt)],
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id),
    role: text("role", { enum: CHAT_ROLES }).notNull(),
    content: text("content").notNull(),
    // Brand the payload so select sees TToolCall[] instead of the column's `unknown`.
    toolCalls: text("tool_calls", { mode: "json" }).$type<TToolCall[] & JsonValueOf<TToolCall[]>>(),
    toolResults: text("tool_results", { mode: "json" }).$type<
      TToolResult[] & JsonValueOf<TToolResult[]>
    >(),
    references: text("references", { mode: "json" }).$type<
      TReference[] & JsonValueOf<TReference[]>
    >(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("chat_messages_session_created_idx").on(t.sessionId, t.createdAt)],
);

const lawyerRefinements = {
  name: (s: z.ZodString) => s.min(1),
  practiceAreas: () => z.array(z.enum(PRACTICE_AREAS)).min(1),
  district: () => z.enum(DISTRICTS),
  languages: () => z.array(z.enum(LANGUAGES)).min(1),
  bookingUrl: (s: z.ZodString) => s.url(),
  yearsOfExperience: (s: z.ZodNumber) => s.int().min(0),
  bio: (s: z.ZodString) => s.max(500),
  consultationFee: (s: z.ZodNumber) => s.int().min(0),
  consultationModes: () => z.array(z.enum(CONSULTATION_MODES)),
  courts: () => z.array(z.enum(COURTS)),
  education: () => z.array(ZLawyerEducation),
  barEnrollmentYear: (s: z.ZodNumber) => s.int().min(1950).max(2030),
};

export const ZLawyer = createSelectSchema(lawyers, lawyerRefinements);
export const ZLawyerCreate = createInsertSchema(
  lawyers,
  lawyerRefinements,
).omit({ id: true, createdAt: true, updatedAt: true });
export const ZLawyerUpdate = createUpdateSchema(
  lawyers,
  lawyerRefinements,
).omit({ id: true, createdAt: true, updatedAt: true });

// Admin responses carry a resolved display URL alongside the stored key.
export const ZLawyerWithImage = ZLawyer.extend({
  imageUrl: z.string().nullable(),
});

export const ZPublicLawyer = z.object({
  id: z.string(),
  name: z.string(),
  practiceAreas: z.array(z.enum(PRACTICE_AREAS)),
  district: z.enum(DISTRICTS),
  languages: z.array(z.enum(LANGUAGES)),
  yearsOfExperience: z.number().nullable(),
  bio: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  verified: z.boolean(),
  consultationFee: z.number().int().min(0).nullable(),
  freeFirstConsultation: z.boolean(),
  consultationModes: z.array(z.enum(CONSULTATION_MODES)).nullable(),
});

// Detail/profile view adds the trust and credential signals the list
// deliberately hides (courts, credentials, education). Contact details
// (phone, email, office address) are deliberately absent — the bookingUrl
// is the only reach mechanism. Internal fields (imageKey, timestamps,
// active) stay out of public surfaces; `memberSince` is the year derived
// from createdAt.
export const ZPublicLawyerDetail = ZPublicLawyer.extend({
  barNumber: z.string().nullable(),
  firmName: z.string().nullable(),
  courts: z.array(z.enum(COURTS)).nullable(),
  education: z.array(ZLawyerEducation).nullable(),
  barEnrollmentYear: z.number().int().min(1950).max(2030).nullable(),
  memberSince: z.number().int().min(1950).max(2030),
});

export const ZDocument = createSelectSchema(documents);
export const ZDocumentCreate = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const ZDocumentNode = createSelectSchema(documentNodes);

// Public list surface. Internal fields (summary, timestamps, source) stay out.
export const ZPublicDocument = z.object({
  id: z.string(),
  title: z.string(),
  documentType: z.enum(DOCUMENT_TYPES),
  yearBs: z.number().nullable(),
  yearAd: z.number().nullable(),
});

// Detail adds the fields the list deliberately hides.
export const ZPublicDocumentDetail = ZPublicDocument.extend({
  totalPages: z.number().nullable(),
  summary: z.string().nullable(),
});

// Outline node: the tree without the (potentially huge) body text.
export interface TDocumentNodeOutline
  extends Omit<z.infer<typeof ZDocumentNode>, "content" | "createdAt"> {
  children: TDocumentNodeOutline[];
}

export const ZDocumentNodeOutline: z.ZodType<TDocumentNodeOutline> = z.lazy(() =>
  z.object({
    id: z.string(),
    documentId: z.string(),
    parentId: z.string().nullable(),
    depth: z.number().int(),
    nodeType: z.enum(DOCUMENT_NODE_TYPES),
    identifier: z.string(),
    title: z.string(),
    heading: z.string().nullable(),
    position: z.number().int(),
    citation: z.string().nullable(),
    children: z.array(ZDocumentNodeOutline),
  }),
);

export const ZDocumentOutline = z.object({
  documentId: z.string(),
  title: z.string(),
  nodes: z.array(ZDocumentNodeOutline),
});

export type TDocument = z.infer<typeof ZDocument>;
export type TDocumentCreate = z.infer<typeof ZDocumentCreate>;
export type TDocumentNode = z.infer<typeof ZDocumentNode>;
export type TDocumentOutline = z.infer<typeof ZDocumentOutline>;
export type TPublicDocument = z.infer<typeof ZPublicDocument>;
export type TPublicDocumentDetail = z.infer<typeof ZPublicDocumentDetail>;

const userRefinements = {
  email: (s: z.ZodString) => s.email(),
  name: (s: z.ZodString) => s.min(1),
  district: () => z.enum(DISTRICTS).nullable(),
  language: () => z.enum(LANGUAGES),
};

export const ZUser = createSelectSchema(users, userRefinements);
export const ZPublicUser = ZUser.omit({ passwordHash: true });

export const ZAuthRegister = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
  district: z.enum(DISTRICTS).nullable().default(null),
  isResearcher: z.boolean().default(false),
});
export const ZAuthLogin = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});
export const ZAuthUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  district: z.enum(DISTRICTS).nullable().optional(),
  isResearcher: z.boolean().optional(),
  language: z.enum(LANGUAGES).optional(),
});

export const ZChatSession = createSelectSchema(chatSessions);
// createSelectSchema maps json columns to ZodType<Json>, which would infer JSONValue.
export const ZChatMessageToolCalls = z.array(ZToolCall).nullable();
export const ZChatMessageToolResults = z.array(ZToolResult).nullable();
export const ZChatMessageReferences = z.array(ZReference).nullable();
export const ZChatMessage = createSelectSchema(chatMessages, {
  toolCalls: () => ZChatMessageToolCalls,
  toolResults: () => ZChatMessageToolResults,
  references: () => ZChatMessageReferences,
});
export const ZChatSend = z.object({
  content: z.string().trim().min(1).max(4000),
});
// Streamed as a transient UI data part so the sidebar can name a session
// before its first answer finishes.
export const ZChatTitle = z.object({
  sessionId: z.string(),
  title: z.string(),
});

export type TLawyer = z.infer<typeof ZLawyer>;
export type TLawyerWithImage = z.infer<typeof ZLawyerWithImage>;
export type TLawyerCreate = z.infer<typeof ZLawyerCreate>;
export type TLawyerUpdate = z.infer<typeof ZLawyerUpdate>;
export type TPublicLawyer = z.infer<typeof ZPublicLawyer>;
export type TPublicLawyerDetail = z.infer<typeof ZPublicLawyerDetail>;

export type TToolCall = z.infer<typeof ZToolCall>;
export type TToolResult = z.infer<typeof ZToolResult>;
export type TReference = z.infer<typeof ZReference>;
export type TCiteOutput = z.infer<typeof ZCiteOutput>;
export type TUser = z.infer<typeof ZUser>;
export type TPublicUser = z.infer<typeof ZPublicUser>;
export type TAuthRegister = z.infer<typeof ZAuthRegister>;
export type TAuthLogin = z.infer<typeof ZAuthLogin>;
export type TAuthUpdate = z.infer<typeof ZAuthUpdate>;
export type TChatSession = z.infer<typeof ZChatSession>;
export type TChatMessage = z.infer<typeof ZChatMessage>;
export type TChatSend = z.infer<typeof ZChatSend>;
export type TChatTitle = z.infer<typeof ZChatTitle>;

export type LawyerRow = typeof lawyers.$inferSelect;
export type LawyerInsert = typeof lawyers.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
export type DocumentNodeRow = typeof documentNodes.$inferSelect;
export type DocumentNodeInsert = typeof documentNodes.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatSessionInsert = typeof chatSessions.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;
