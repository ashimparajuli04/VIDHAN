import { and, eq } from "drizzle-orm";
import { lawyers as lawyersTable } from "@vidhan/schema";
import type {
  LawyerRow,
  TDistrict,
  TLanguage,
  TPracticeArea,
} from "@vidhan/schema";
import type { Db } from "../db";

// Public projection. Internal fields (barNumber, flags, timestamps) never leave
// this module — the chatbot tool will reuse searchLawyers with the same shape.
export type TPublicLawyer = {
  id: string;
  name: string;
  practiceAreas: TPracticeArea[];
  district: TDistrict;
  languages: TLanguage[];
  yearsOfExperience: number | null;
  bio: string | null;
  bookingUrl: string | null;
};

export type TLawyerSearchQuery = {
  practiceAreas: TPracticeArea[];
  districts: TDistrict[];
  languages: TLanguage[];
  limit: number;
  offset: number;
};

export type TLawyerSearchMeta = {
  total: number;
  districtCounts?: Record<string, number>;
};

export type TLawyerSearchResult = {
  lawyers: TPublicLawyer[];
  meta: TLawyerSearchMeta;
};

export function toPublicLawyer(row: LawyerRow): TPublicLawyer {
  return {
    id: row.id,
    name: row.name,
    practiceAreas: row.practiceAreas,
    district: row.district as TDistrict,
    languages: row.languages,
    yearsOfExperience: row.yearsOfExperience,
    bio: row.bio,
    bookingUrl: row.bookingUrl,
  };
}

// Catalog slice is small (mock 50–100), so ranking/pagination stays in memory.
export async function searchLawyers(
  db: Db,
  query: TLawyerSearchQuery,
): Promise<TLawyerSearchResult> {
  const rows = await db
    .select()
    .from(lawyersTable)
    .where(and(eq(lawyersTable.active, true), eq(lawyersTable.verified, true)));

  const practiceSet = new Set<string>(query.practiceAreas);
  const districtSet = new Set<string>(query.districts);
  const languageSet = new Set<string>(query.languages);

  const practiceScoped = rows.filter(
    (row) =>
      practiceSet.size === 0 ||
      row.practiceAreas.some((area) => practiceSet.has(area)),
  );

  const matched = practiceScoped.filter(
    (row) => districtSet.size === 0 || districtSet.has(row.district),
  );
  matched.sort(compareByLanguageThenRank(languageSet));

  const meta: TLawyerSearchMeta = { total: matched.length };
  if (matched.length === 0) {
    meta.districtCounts = countByDistrict(practiceScoped);
  }

  const page = matched.slice(query.offset, query.offset + query.limit);
  return { lawyers: page.map(toPublicLawyer), meta };
}

export async function findPublicLawyer(
  db: Db,
  id: string,
): Promise<TPublicLawyer | null> {
  const row = await db
    .select()
    .from(lawyersTable)
    .where(
      and(
        eq(lawyersTable.id, id),
        eq(lawyersTable.active, true),
        eq(lawyersTable.verified, true),
      ),
    )
    .get();
  return row ? toPublicLawyer(row) : null;
}

function compareByLanguageThenRank(languages: Set<string>) {
  return (a: LawyerRow, b: LawyerRow): number => {
    const aLang = a.languages.some((l) => languages.has(l)) ? 0 : 1;
    const bLang = b.languages.some((l) => languages.has(l)) ? 0 : 1;
    if (aLang !== bLang) return aLang - bLang;

    const aYears = a.yearsOfExperience ?? -1;
    const bYears = b.yearsOfExperience ?? -1;
    if (aYears !== bYears) return bYears - aYears;

    return a.name.localeCompare(b.name);
  };
}

function countByDistrict(rows: LawyerRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.district] = (counts[row.district] ?? 0) + 1;
  }
  return counts;
}
