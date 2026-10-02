import { tool } from "ai";
import { z } from "zod/v4";
import { DISTRICTS, LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";
import { createDb } from "../db";
import { searchLawyers, type TLawyerSearchResult } from "../lawyers";
import type { Env } from "../index";

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
  };
}

export type TToolSet = ReturnType<typeof buildTools>;
