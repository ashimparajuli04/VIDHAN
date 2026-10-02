import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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

export const lawyers = sqliteTable(
  "lawyers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    practiceAreas: text("practice_areas", { mode: "json" })
      .$type<(typeof PRACTICE_AREAS)[number][]>()
      .notNull(),
    city: text("city").notNull(),
    languages: text("languages", { mode: "json" })
      .$type<(typeof LANGUAGES)[number][]>()
      .notNull(),
    bookingUrl: text("booking_url").notNull(),
    barNumber: text("bar_number"),
    yearsOfExperience: integer("years_of_experience"),
    bio: text("bio"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("lawyers_practice_city_idx").on(t.practiceAreas, t.city)],
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

const lawyerRefinements = {
  name: (s: z.ZodString) => s.min(1),
  practiceAreas: () => z.array(z.enum(PRACTICE_AREAS)).min(1),
  city: (s: z.ZodString) => s.min(1),
  languages: () => z.array(z.enum(LANGUAGES)).min(1),
  bookingUrl: () => z.url(),
  yearsOfExperience: (s: z.ZodNumber) => s.int().min(0),
  bio: (s: z.ZodString) => s.max(500),
};

export const lawyerSchema = createSelectSchema(lawyers, lawyerRefinements);
export const lawyerCreateSchema = createInsertSchema(
  lawyers,
  lawyerRefinements,
).omit({ id: true, createdAt: true, updatedAt: true });
export const lawyerUpdateSchema = createUpdateSchema(
  lawyers,
  lawyerRefinements,
).omit({ id: true, createdAt: true, updatedAt: true });

export const documentSchema = createSelectSchema(documents);
export const documentCreateSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lawyer = z.infer<typeof lawyerSchema>;
export type LawyerCreate = z.infer<typeof lawyerCreateSchema>;
export type LawyerUpdate = z.infer<typeof lawyerUpdateSchema>;
export type Document = z.infer<typeof documentSchema>;
export type DocumentCreate = z.infer<typeof documentCreateSchema>;

export type LawyerRow = typeof lawyers.$inferSelect;
export type LawyerInsert = typeof lawyers.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
