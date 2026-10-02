import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
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

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    status: text("status", { enum: ["pending", "indexed", "failed"] })
      .notNull()
      .default("pending"),
    chunkCount: integer("chunk_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("documents_status_idx").on(t.status)],
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

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    district: text("district"),
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
});

export const documentSchema = createSelectSchema(documents);
export const documentCreateSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
});
export const ZAuthLogin = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});
export const ZAuthUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  district: z.enum(DISTRICTS).nullable().optional(),
  language: z.enum(LANGUAGES).optional(),
});

export const ZChatSession = createSelectSchema(chatSessions);
// createSelectSchema types json columns as JSONValue; refine to recover TToolCall[].
// createSelectSchema maps json columns to ZodType<Json>, which would infer JSONValue.
export const ZChatMessageToolCalls = z.array(ZToolCall).nullable();
export const ZChatMessageToolResults = z.array(ZToolResult).nullable();
export const ZChatMessage = createSelectSchema(chatMessages, {
  toolCalls: () => ZChatMessageToolCalls,
  toolResults: () => ZChatMessageToolResults,
});
export const ZChatSend = z.object({
  content: z.string().trim().min(1).max(4000),
});

export type TLawyer = z.infer<typeof ZLawyer>;
export type TLawyerWithImage = z.infer<typeof ZLawyerWithImage>;
export type TLawyerCreate = z.infer<typeof ZLawyerCreate>;
export type TLawyerUpdate = z.infer<typeof ZLawyerUpdate>;
export type TPublicLawyer = z.infer<typeof ZPublicLawyer>;
export type Document = z.infer<typeof documentSchema>;
export type DocumentCreate = z.infer<typeof documentCreateSchema>;

export type TToolCall = z.infer<typeof ZToolCall>;
export type TToolResult = z.infer<typeof ZToolResult>;
export type TUser = z.infer<typeof ZUser>;
export type TPublicUser = z.infer<typeof ZPublicUser>;
export type TAuthRegister = z.infer<typeof ZAuthRegister>;
export type TAuthLogin = z.infer<typeof ZAuthLogin>;
export type TAuthUpdate = z.infer<typeof ZAuthUpdate>;
export type TChatSession = z.infer<typeof ZChatSession>;
export type TChatMessage = z.infer<typeof ZChatMessage>;
export type TChatSend = z.infer<typeof ZChatSend>;

export type LawyerRow = typeof lawyers.$inferSelect;
export type LawyerInsert = typeof lawyers.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatSessionInsert = typeof chatSessions.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;
