import {
  index,
  integer,
  primaryKey,
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

// Willingness to be reached for a consultation. Courts cover the three
// tiers of Nepal's judiciary (Supreme → High → District); special courts
// and tribunals are deliberately not part of the model.
export const CONSULTATION_MODES = ["in_person", "phone", "video"] as const;
export const LAWYER_REQUEST_STATUSES = ["pending", "contacted", "closed"] as const;
export const COURTS = [
  "supreme_court",
  "high_court",
  "district_court",
] as const;

// Professional designation; `senior_advocate` is the higher rank.
export const SENIORITY_LEVELS = ["senior_advocate", "advocate"] as const;

// The case-count breakdown covers the same three tiers as COURTS.
export const CASE_COUNT_COURTS = COURTS;

// Where a lawyer fought cases. All keys present (0 is a valid count), so
// the breakdown is uniform to render and sum. `totalCases` is stored
// independently — the breakdown is split info, not required to sum to it.
export const ZCaseCounts = z.object({
  supreme_court: z.number().int().min(0),
  high_court: z.number().int().min(0),
  district_court: z.number().int().min(0),
});
export type TCaseCounts = z.infer<typeof ZCaseCounts>;
export type TSeniority = (typeof SENIORITY_LEVELS)[number];
export type TCaseCountCourt = (typeof CASE_COUNT_COURTS)[number];

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
export type TRequestStatus = (typeof LAWYER_REQUEST_STATUSES)[number];
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
    barNumber: text("bar_number"),
    yearsOfExperience: integer("years_of_experience"),
    bio: text("bio"),
    imageKey: text("image_key"),
    firmName: text("firm_name"),
    consultationModes: text("consultation_modes", { mode: "json" })
      .$type<TConsultationMode[]>(),
    courts: text("courts", { mode: "json" }).$type<TCourt[]>(),
    education: text("education", { mode: "json" })
      .$type<TLawyerEducation[]>(),
    barEnrollmentYear: integer("bar_enrollment_year"),
    seniority: text("seniority", { enum: SENIORITY_LEVELS })
      .notNull()
      .default("advocate"),
    totalCases: integer("total_cases"),
    caseCounts: text("case_counts", { mode: "json" }).$type<TCaseCounts>(),
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
  "article",
  "sub_section",
  "clause",
  "rule",
  "schedule",
] as const;
export type TDocumentNodeType = (typeof DOCUMENT_NODE_TYPES)[number];

// Structural-only node types, never carrying body text. Everything else is a
// citable provision. The corpus mixes acts (`section`), rules (`rule`) and
// schedules, so consumers must test against containers, not an allow-list of
// content types — an allow-list silently drops any type it was not updated for.
export const DOCUMENT_CONTAINER_NODE_TYPES = [
  "part",
  "chapter",
  "section_group",
] as const satisfies readonly TDocumentNodeType[];

export function isDocumentContentNode(nodeType: string): boolean {
  return !(DOCUMENT_CONTAINER_NODE_TYPES as readonly string[]).includes(nodeType);
}

// Display label for a node. `title` is often an empty string (not null) on
// containers and clauses, so a plain `heading ?? title ?? identifier` chain
// stops at the blank and renders nothing; skip blanks explicitly.
export function nodeLabel(node: {
  heading?: string | null;
  title?: string | null;
  identifier?: string | null;
}): string {
  for (const candidate of [node.heading, node.title, node.identifier]) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

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

// Section-level semantic vectors for hybrid chat retrieval. Separate from
// `document_nodes` because the FTS external-content triggers fire on every
// column write and would churn on each vector upsert. `vector` is float32
// little-endian, L2-normalized, so cosine becomes a plain dot product.
export const documentNodeEmbeddings = sqliteTable(
  "document_node_embeddings",
  {
    nodeId: text("node_id")
      .primaryKey()
      .references(() => documentNodes.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    dims: integer("dims").notNull(),
    vector: text("vector").notNull(),
    contentHash: text("content_hash").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("document_node_embeddings_model_idx").on(t.model)],
);

export type DocumentNodeEmbeddingRow = typeof documentNodeEmbeddings.$inferSelect;
export type DocumentNodeEmbeddingInsert = typeof documentNodeEmbeddings.$inferInsert;

export const CHAT_ROLES = ["user", "assistant"] as const;

declare const jsonDataType: unique symbol;
type JsonValueOf<T> = { [jsonDataType]: T };

// `$type` changes only the select type; inserts still demand the branded payload.
export function asJson<T>(value: T[]): T[] & JsonValueOf<T[]> {
  return value as T[] & JsonValueOf<T[]>;
}

// Same branding for object-shaped JSON columns (e.g. `case_counts`);
// `asJson` above only handles arrays.
export function asJsonObject<T extends object>(value: T): T & JsonValueOf<T> {
  return value as T & JsonValueOf<T>;
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
    isSubscribed: integer("is_subscribed", { mode: "boolean" })
      .notNull()
      .default(false),
    language: text("language").notNull().default("en"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

// The plan cards on the Profile page render these same numbers, so the
// displayed allocation and the enforced meter can never drift.
export const USAGE_LIMITS = { free: 500_000, subscribed: 5_000_000 } as const;

// One row per (user, NPT calendar date); the day boundary is the reset.
export const userUsage = sqliteTable(
  "user_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(),
    tokens: integer("tokens").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

// Callback lead captured on-platform: the user asks Vidhan to arrange a
// consultation, admin works the queue. No lawyer contact data is exposed.
export const lawyerRequests = sqliteTable(
  "lawyer_requests",
  {
    id: text("id").primaryKey(),
    lawyerId: text("lawyer_id")
      .notNull()
      .references(() => lawyers.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    phone: text("phone").notNull(),
    preferredTime: text("preferred_time").notNull(),
    mode: text("mode", { enum: CONSULTATION_MODES }),
    note: text("note"),
    status: text("status", { enum: LAWYER_REQUEST_STATUSES })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("lawyer_requests_user_created_idx").on(t.userId, t.createdAt),
    index("lawyer_requests_lawyer_idx").on(t.lawyerId),
  ],
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

export const SUPPORT_TICKET_CATEGORIES = [
  "missing_document",
  "missing_lawyer",
  "other",
] as const;
export const SUPPORT_TICKET_SOURCES = [
  "support_page",
  "chat",
  "enterprise_request",
] as const;
export const SUPPORT_TICKET_STATUSES = ["open", "closed"] as const;
export const SUPPORT_TICKET_AUTHOR_ROLES = ["user", "admin"] as const;

export type TSupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type TSupportTicketSource = (typeof SUPPORT_TICKET_SOURCES)[number];
export type TSupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type TSupportTicketAuthorRole =
  (typeof SUPPORT_TICKET_AUTHOR_ROLES)[number];

// Threaded issue report. The opening body lives in support_ticket_messages
// (the first `user` row), so the ticket row carries no body column.
export const supportTickets = sqliteTable(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    subject: text("subject").notNull(),
    category: text("category", { enum: SUPPORT_TICKET_CATEGORIES }).notNull(),
    source: text("source", { enum: SUPPORT_TICKET_SOURCES }).notNull(),
    status: text("status", { enum: SUPPORT_TICKET_STATUSES })
      .notNull()
      .default("open"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("support_tickets_user_updated_idx").on(t.userId, t.updatedAt),
    index("support_tickets_status_updated_idx").on(t.status, t.updatedAt),
  ],
);

export const supportTicketMessages = sqliteTable(
  "support_ticket_messages",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => supportTickets.id),
    authorRole: text("author_role", {
      enum: SUPPORT_TICKET_AUTHOR_ROLES,
    }).notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("support_ticket_messages_ticket_created_idx").on(
      t.ticketId,
      t.createdAt,
    ),
  ],
);

// ───────────────────────────── Enterprise ─────────────────────────────

// Enterprise access is an organization-level account: Vidhan reviews a
// request, approves it with negotiated limits, and only then do seats and
// a token allocation exist. The whole life cycle is discussed through the
// linked support ticket — there is no separate enterprise messaging system.
export const ENTERPRISE_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "awaiting_customer",
  "negotiation",
  "approved",
  "active",
  "rejected",
  "closed",
] as const;
export const ENTERPRISE_CONTACT_METHODS = ["email", "phone"] as const;
export const ENTERPRISE_CAPABILITIES = [
  "higher_token_allocation",
  "multiple_employee_accounts",
  "organization_wide_access",
  "team_user_management",
  "usage_analytics",
  "custom_document_repository",
  "api_access",
  "custom_integrations",
  "dedicated_support",
  "custom_security_deployment",
  "other",
] as const;

export type TEnterpriseRequestStatus = (typeof ENTERPRISE_REQUEST_STATUSES)[number];
export type TEnterpriseContactMethod = (typeof ENTERPRISE_CONTACT_METHODS)[number];
export type TEnterpriseCapability = (typeof ENTERPRISE_CAPABILITIES)[number];

export const ENTERPRISE_ORGANIZATION_STATUSES = [
  "active",
  "suspended",
  "closed",
] as const;
export const ENTERPRISE_MEMBER_ROLES = ["admin", "member"] as const;
export const ENTERPRISE_MEMBER_STATUSES = [
  "active",
  "invited",
  "deactivated",
] as const;

export type TEnterpriseOrganizationStatus =
  (typeof ENTERPRISE_ORGANIZATION_STATUSES)[number];
export type TEnterpriseMemberRole = (typeof ENTERPRISE_MEMBER_ROLES)[number];
export type TEnterpriseMemberStatus = (typeof ENTERPRISE_MEMBER_STATUSES)[number];

// One request per prospective organization. The approval fields (approved*,
// adminNotes) stay null until an admin approves; member rows only exist
// after EnterpriseOrganization is created.
export const enterpriseRequests = sqliteTable(
  "enterprise_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    supportTicketId: text("support_ticket_id").references(
      () => supportTickets.id,
    ),
    status: text("status", { enum: ENTERPRISE_REQUEST_STATUSES })
      .notNull()
      .default("new"),
    organizationName: text("organization_name").notNull(),
    organizationType: text("organization_type").notNull(),
    industry: text("industry").notNull(),
    website: text("website"),
    country: text("country").notNull(),
    city: text("city").notNull(),
    employeeCount: text("employee_count").notNull(),
    contactName: text("contact_name").notNull(),
    contactTitle: text("contact_title").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    preferredContactMethod: text("preferred_contact_method", {
      enum: ENTERPRISE_CONTACT_METHODS,
    }).notNull(),
    expectedUsers: integer("expected_users").notNull(),
    expectedUsage: text("expected_usage").notNull(),
    teamsDepartments: text("teams_departments").notNull(),
    intendedUse: text("intended_use").notNull(),
    expectedStartDate: text("expected_start_date").notNull(),
    requestedCapabilities: text("requested_capabilities", { mode: "json" })
      .$type<TEnterpriseCapability[] & JsonValueOf<TEnterpriseCapability[]>>()
      .notNull(),
    additionalRequirements: text("additional_requirements"),
    approvedSeats: integer("approved_seats"),
    approvedTokensPerMember: integer("approved_tokens_per_member"),
    approvedStartDate: text("approved_start_date"),
    adminNotes: text("admin_notes"),
    approvedAt: text("approved_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("enterprise_requests_user_created_idx").on(t.userId, t.createdAt),
    index("enterprise_requests_status_updated_idx").on(t.status, t.updatedAt),
  ],
);

// Created by the admin approval action; carries the negotiated limits the
// organization and its members live under. One organization per request.
export const enterpriseOrganizations = sqliteTable(
  "enterprise_organizations",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => enterpriseRequests.id),
    name: text("name").notNull(),
    status: text("status", { enum: ENTERPRISE_ORGANIZATION_STATUSES })
      .notNull()
      .default("active"),
    approvedSeats: integer("approved_seats").notNull(),
    tokensPerMember: integer("tokens_per_member").notNull(),
    startDate: text("start_date"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("enterprise_organizations_request_unique").on(t.requestId),
  ],
);

// Who sits in the organization. `userId` is null while an invite is
// outstanding and set when the invitee signs in; `tokensAllocated` is null
// when the organization default (tokens_per_member) applies.
export const enterpriseMembers = sqliteTable(
  "enterprise_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => enterpriseOrganizations.id),
    userId: text("user_id").references(() => users.id),
    email: text("email").notNull(),
    role: text("role", { enum: ENTERPRISE_MEMBER_ROLES })
      .notNull()
      .default("member"),
    status: text("status", { enum: ENTERPRISE_MEMBER_STATUSES })
      .notNull()
      .default("invited"),
    tokensAllocated: integer("tokens_allocated"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("enterprise_members_org_status_idx").on(t.organizationId, t.status),
    uniqueIndex("enterprise_members_org_email_unique").on(
      t.organizationId,
      t.email,
    ),
  ],
);

const lawyerRefinements = {
  name: (s: z.ZodString) => s.min(1),
  practiceAreas: () => z.array(z.enum(PRACTICE_AREAS)).min(1),
  district: () => z.enum(DISTRICTS),
  languages: () => z.array(z.enum(LANGUAGES)).min(1),
  yearsOfExperience: (s: z.ZodNumber) => s.int().min(0),
  bio: (s: z.ZodString) => s.max(500),
  consultationModes: () => z.array(z.enum(CONSULTATION_MODES)),
  courts: () => z.array(z.enum(COURTS)),
  education: () => z.array(ZLawyerEducation),
  barEnrollmentYear: (s: z.ZodNumber) => s.int().min(1950).max(2030),
  seniority: () => z.enum(SENIORITY_LEVELS),
  totalCases: (s: z.ZodNumber) => s.int().min(0),
  caseCounts: () => ZCaseCounts.nullable(),
};

export const ZLawyer = createSelectSchema(lawyers, lawyerRefinements);
// The column carries a DB default, which would make seniority optional in
// createInsertSchema; seniority is mandatory for every lawyer, so force it.
export const ZLawyerCreate = createInsertSchema(
  lawyers,
  lawyerRefinements,
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ seniority: z.enum(SENIORITY_LEVELS) });
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
  imageUrl: z.string().nullable(),
  verified: z.boolean(),
  totalCases: z.number().int().min(0).nullable(),
  seniority: z.enum(SENIORITY_LEVELS),
  consultationModes: z.array(z.enum(CONSULTATION_MODES)).nullable(),
});

// Detail/profile view adds the trust and credential signals the list
// deliberately hides (courts, credentials, education). Contact details
// (phone, email, office address) are deliberately absent — a lawyer is
// reached only through a platform callback request. Internal fields
// (imageKey, timestamps, active) stay out of public surfaces; `memberSince`
// is the year derived from createdAt.
export const ZPublicLawyerDetail = ZPublicLawyer.extend({
  barNumber: z.string().nullable(),
  firmName: z.string().nullable(),
  courts: z.array(z.enum(COURTS)).nullable(),
  education: z.array(ZLawyerEducation).nullable(),
  barEnrollmentYear: z.number().int().min(1950).max(2030).nullable(),
  memberSince: z.number().int().min(1950).max(2030),
  seniority: z.enum(SENIORITY_LEVELS),
  totalCases: z.number().int().min(0).nullable(),
  caseCounts: ZCaseCounts.nullable(),
});

export const ZLawyerRequestCreate = z.object({
  lawyerId: z.string().min(1),
  phone: z.string().trim().min(1).max(40),
  preferredTime: z.string().trim().min(1).max(200),
  mode: z.enum(CONSULTATION_MODES).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});
export const ZLawyerRequestStatusUpdate = z.object({
  status: z.enum(LAWYER_REQUEST_STATUSES),
});

// Own view: the requester already knows their phone, so it is omitted.
export const ZPublicLawyerRequest = z.object({
  id: z.string(),
  lawyerId: z.string(),
  lawyerName: z.string(),
  preferredTime: z.string(),
  mode: z.enum(CONSULTATION_MODES).nullable(),
  note: z.string().nullable(),
  status: z.enum(LAWYER_REQUEST_STATUSES),
  createdAt: z.string(),
});

// Admin view resolves both parties so the queue can be worked without joins.
export const ZAdminLawyerRequest = ZPublicLawyerRequest.extend({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  phone: z.string(),
  updatedAt: z.string(),
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
// Plan state stays off the public user surface; the usage module owns it.
export const ZPublicUser = ZUser.omit({ passwordHash: true, isSubscribed: true });

export const ZUsage = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().min(0),
  resetAt: z.string(),
  isSubscribed: z.boolean(),
});

export const ZAdminUser = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  isSubscribed: z.boolean(),
  createdAt: z.string(),
});
export const ZAdminUserUpdate = z.object({
  isSubscribed: z.boolean(),
});

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

export const ZSupportTicketCreate = z.object({
  subject: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1).max(4000),
  category: z.enum(SUPPORT_TICKET_CATEGORIES),
  source: z.enum(SUPPORT_TICKET_SOURCES),
});
export const ZSupportTicketMessageCreate = z.object({
  body: z.string().trim().min(1).max(4000),
});
export const ZSupportTicketStatusUpdate = z.object({
  status: z.enum(SUPPORT_TICKET_STATUSES),
});

// Response projections. `userId` stays server-side; the admin view adds the
// resolved user instead.
export const ZSupportTicket = z.object({
  id: z.string(),
  subject: z.string(),
  category: z.enum(SUPPORT_TICKET_CATEGORIES),
  source: z.enum(SUPPORT_TICKET_SOURCES),
  status: z.enum(SUPPORT_TICKET_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ZSupportTicketMessage = z.object({
  id: z.string(),
  authorRole: z.enum(SUPPORT_TICKET_AUTHOR_ROLES),
  body: z.string(),
  createdAt: z.string(),
});
export const ZSupportTicketDetail = ZSupportTicket.extend({
  messages: z.array(ZSupportTicketMessage),
});
export const ZSupportTicketUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export const ZAdminSupportTicket = ZSupportTicket.extend({
  user: ZSupportTicketUser,
});
export const ZAdminSupportTicketDetail = ZSupportTicketDetail.extend({
  user: ZSupportTicketUser,
});

// ───────────────────────── Enterprise schemas ─────────────────────────

export const ZEnterpriseRequestCreate = z.object({
  organizationName: z.string().trim().min(1).max(160),
  organizationType: z.string().trim().min(1).max(120),
  industry: z.string().trim().min(1).max(120),
  website: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value.length > 0 ? value : null))
    .optional(),
  country: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  employeeCount: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  contactTitle: z.string().trim().min(1).max(120),
  contactEmail: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  contactPhone: z.string().trim().min(1).max(40),
  preferredContactMethod: z.enum(ENTERPRISE_CONTACT_METHODS),
  expectedUsers: z.number().int().min(1).max(100_000),
  expectedUsage: z.string().trim().min(1).max(1000),
  teamsDepartments: z.string().trim().min(1).max(500),
  intendedUse: z.string().trim().min(1).max(1000),
  expectedStartDate: z.string().trim().min(1).max(120),
  requestedCapabilities: z
    .array(z.enum(ENTERPRISE_CAPABILITIES))
    .min(1)
    .max(ENTERPRISE_CAPABILITIES.length),
  additionalRequirements: z
    .string()
    .trim()
    .max(4000)
    .transform((value) => (value.length > 0 ? value : null))
    .optional(),
});

export const ZEnterpriseRequestStatusUpdate = z.object({
  status: z.enum(ENTERPRISE_REQUEST_STATUSES),
});

export const ZEnterpriseRequest = z.object({
  id: z.string(),
  status: z.enum(ENTERPRISE_REQUEST_STATUSES),
  supportTicketId: z.string().nullable(),
  organizationName: z.string(),
  organizationType: z.string(),
  industry: z.string(),
  website: z.string().nullable(),
  country: z.string(),
  city: z.string(),
  employeeCount: z.string(),
  contactName: z.string(),
  contactTitle: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  preferredContactMethod: z.enum(ENTERPRISE_CONTACT_METHODS),
  expectedUsers: z.number().int(),
  expectedUsage: z.string(),
  teamsDepartments: z.string(),
  intendedUse: z.string(),
  expectedStartDate: z.string(),
  requestedCapabilities: z.array(z.enum(ENTERPRISE_CAPABILITIES)),
  additionalRequirements: z.string().nullable(),
  approvedSeats: z.number().int().nullable(),
  approvedTokensPerMember: z.number().int().nullable(),
  approvedStartDate: z.string().nullable(),
  adminNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Admin view resolves the requester so the queue can be worked without joins.
export const ZAdminEnterpriseRequest = ZEnterpriseRequest.extend({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
});

// Admin detail adds the linked support thread (`messages`) so clarification
// happens in the same conversation the user sees.
export const ZAdminEnterpriseRequestDetail = ZAdminEnterpriseRequest.extend({
  messages: z.array(ZSupportTicketMessage),
});

// Approval is a Vidhan-admin action: the negotiated seat count and per-member
// token allocation are stored on the request and copied into the
// organization when it is created.
export const ZEnterpriseApprovalConfig = z.object({
  approvedSeats: z.number().int().min(1).max(1_000_000),
  approvedTokensPerMember: z.number().int().min(1).max(10_000_000_000),
  approvedStartDate: z.string().trim().min(1).max(120),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null))
    .optional(),
});

export const ZEnterpriseOrganization = z.object({
  id: z.string(),
  requestId: z.string(),
  name: z.string(),
  status: z.enum(ENTERPRISE_ORGANIZATION_STATUSES),
  approvedSeats: z.number().int(),
  tokensPerMember: z.number().int(),
  startDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ZEnterpriseMember = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  email: z.string(),
  role: z.enum(ENTERPRISE_MEMBER_ROLES),
  status: z.enum(ENTERPRISE_MEMBER_STATUSES),
  tokensAllocated: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Member view resolves the display name when the member is a platform user.
export const ZEnterpriseMemberView = ZEnterpriseMember.extend({
  userName: z.string().nullable(),
});

export const ZEnterpriseOrganizationDetail = ZEnterpriseOrganization.extend({
  members: z.array(ZEnterpriseMemberView),
});

// What the web sidebar and profile need to know: which active organization
// the signed-in user belongs to and their role inside it.
export const ZEnterpriseMembership = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  role: z.enum(ENTERPRISE_MEMBER_ROLES),
});

export const ZEnterpriseMemberCreate = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
});

export const ZEnterpriseMemberStatusUpdate = z.object({
  status: z.enum(["active", "deactivated"]),
});

// Admin list adds the seat count so the queue shows capacity at a glance.
export const ZAdminEnterpriseOrganization = ZEnterpriseOrganization.extend({
  memberCount: z.number().int(),
});

export type TLawyer = z.infer<typeof ZLawyer>;
export type TLawyerWithImage = z.infer<typeof ZLawyerWithImage>;
export type TLawyerCreate = z.infer<typeof ZLawyerCreate>;
export type TLawyerUpdate = z.infer<typeof ZLawyerUpdate>;
export type TPublicLawyer = z.infer<typeof ZPublicLawyer>;
export type TPublicLawyerDetail = z.infer<typeof ZPublicLawyerDetail>;
export type TLawyerRequestCreate = z.infer<typeof ZLawyerRequestCreate>;
export type TLawyerRequestStatusUpdate = z.infer<
  typeof ZLawyerRequestStatusUpdate
>;
export type TPublicLawyerRequest = z.infer<typeof ZPublicLawyerRequest>;
export type TAdminLawyerRequest = z.infer<typeof ZAdminLawyerRequest>;

export type TToolCall = z.infer<typeof ZToolCall>;
export type TToolResult = z.infer<typeof ZToolResult>;
export type TReference = z.infer<typeof ZReference>;
export type TCiteOutput = z.infer<typeof ZCiteOutput>;
export type TUser = z.infer<typeof ZUser>;
export type TPublicUser = z.infer<typeof ZPublicUser>;
export type TUsage = z.infer<typeof ZUsage>;
export type TAdminUser = z.infer<typeof ZAdminUser>;
export type TAdminUserUpdate = z.infer<typeof ZAdminUserUpdate>;
export type TAuthRegister = z.infer<typeof ZAuthRegister>;
export type TAuthLogin = z.infer<typeof ZAuthLogin>;
export type TAuthUpdate = z.infer<typeof ZAuthUpdate>;
export type TChatSession = z.infer<typeof ZChatSession>;
export type TChatMessage = z.infer<typeof ZChatMessage>;
export type TChatSend = z.infer<typeof ZChatSend>;
export type TChatTitle = z.infer<typeof ZChatTitle>;
export type TSupportTicket = z.infer<typeof ZSupportTicket>;
export type TSupportTicketMessage = z.infer<typeof ZSupportTicketMessage>;
export type TSupportTicketDetail = z.infer<typeof ZSupportTicketDetail>;
export type TSupportTicketUser = z.infer<typeof ZSupportTicketUser>;
export type TAdminSupportTicket = z.infer<typeof ZAdminSupportTicket>;
export type TAdminSupportTicketDetail = z.infer<
  typeof ZAdminSupportTicketDetail
>;
export type TSupportTicketCreate = z.infer<typeof ZSupportTicketCreate>;
export type TSupportTicketMessageCreate = z.infer<
  typeof ZSupportTicketMessageCreate
>;
export type TSupportTicketStatusUpdate = z.infer<
  typeof ZSupportTicketStatusUpdate
>;
export type TEnterpriseRequestCreate = z.infer<typeof ZEnterpriseRequestCreate>;
export type TEnterpriseRequestStatusUpdate = z.infer<
  typeof ZEnterpriseRequestStatusUpdate
>;
export type TEnterpriseRequest = z.infer<typeof ZEnterpriseRequest>;
export type TAdminEnterpriseRequest = z.infer<typeof ZAdminEnterpriseRequest>;
export type TAdminEnterpriseRequestDetail = z.infer<
  typeof ZAdminEnterpriseRequestDetail
>;
export type TEnterpriseApprovalConfig = z.infer<typeof ZEnterpriseApprovalConfig>;
export type TEnterpriseOrganization = z.infer<typeof ZEnterpriseOrganization>;
export type TEnterpriseMember = z.infer<typeof ZEnterpriseMember>;
export type TEnterpriseMemberView = z.infer<typeof ZEnterpriseMemberView>;
export type TEnterpriseOrganizationDetail = z.infer<
  typeof ZEnterpriseOrganizationDetail
>;
export type TAdminEnterpriseOrganization = z.infer<
  typeof ZAdminEnterpriseOrganization
>;
export type TEnterpriseMembership = z.infer<typeof ZEnterpriseMembership>;
export type TEnterpriseMemberCreate = z.infer<typeof ZEnterpriseMemberCreate>;
export type TEnterpriseMemberStatusUpdate = z.infer<
  typeof ZEnterpriseMemberStatusUpdate
>;

export type LawyerRow = typeof lawyers.$inferSelect;
export type LawyerInsert = typeof lawyers.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
export type DocumentNodeRow = typeof documentNodes.$inferSelect;
export type DocumentNodeInsert = typeof documentNodes.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type UserUsageRow = typeof userUsage.$inferSelect;
export type UserUsageInsert = typeof userUsage.$inferInsert;
export type LawyerRequestRow = typeof lawyerRequests.$inferSelect;
export type LawyerRequestInsert = typeof lawyerRequests.$inferInsert;
export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatSessionInsert = typeof chatSessions.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;
export type SupportTicketRow = typeof supportTickets.$inferSelect;
export type SupportTicketInsert = typeof supportTickets.$inferInsert;
export type SupportTicketMessageRow = typeof supportTicketMessages.$inferSelect;
export type SupportTicketMessageInsert =
  typeof supportTicketMessages.$inferInsert;
export type EnterpriseRequestRow = typeof enterpriseRequests.$inferSelect;
export type EnterpriseRequestInsert = typeof enterpriseRequests.$inferInsert;
export type EnterpriseOrganizationRow =
  typeof enterpriseOrganizations.$inferSelect;
export type EnterpriseOrganizationInsert =
  typeof enterpriseOrganizations.$inferInsert;
export type EnterpriseMemberRow = typeof enterpriseMembers.$inferSelect;
export type EnterpriseMemberInsert = typeof enterpriseMembers.$inferInsert;
