import { z } from "zod";

export const PRACTICE_AREAS = [
  "criminal", "civil", "family", "property", "consumer", "labor",
  "corporate", "immigration", "tax", "constitutional", "cyber",
  "banking", "human_rights", "other",
] as const;

export const LANGUAGES = ["en", "ne", "roman_ne"] as const;

export const lawyerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  practiceAreas: z.array(z.enum(PRACTICE_AREAS)).min(1),
  city: z.string().min(1),
  languages: z.array(z.enum(LANGUAGES)).min(1),
  bookingUrl: z.string().url(),
  barNumber: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  bio: z.string().max(500).optional(),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lawyer = z.infer<typeof lawyerSchema>;

export const lawyerCreateSchema = lawyerSchema.omit({
  id: true, createdAt: true, updatedAt: true,
});
export const lawyerUpdateSchema = lawyerCreateSchema.partial();

export type LawyerCreate = z.infer<typeof lawyerCreateSchema>;
export type LawyerUpdate = z.infer<typeof lawyerUpdateSchema>;
