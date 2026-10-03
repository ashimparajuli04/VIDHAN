import { and, eq } from "drizzle-orm";
import { lawyers as lawyersTable } from "@vidhan/schema";
import type {
  LawyerRow,
  TDistrict,
  TLanguage,
  TPracticeArea,
  TPublicLawyer,
  TPublicLawyerDetail,
} from "@vidhan/schema";
import type { Db } from "../db";
import type { Env } from "../index";
import { imageUrlFor } from "../uploads/r2";

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

export function toPublicLawyer(
  row: LawyerRow,
  env: Env,
  origin: string,
): TPublicLawyer {
  return {
    id: row.id,
    name: row.name,
    practiceAreas: row.practiceAreas,
    district: row.district as TDistrict,
    languages: row.languages,
    yearsOfExperience: row.yearsOfExperience,
    bio: row.bio,
    bookingUrl: row.bookingUrl,
    imageUrl: imageUrlFor(env, origin, row.imageKey),
    verified: row.verified,
    consultationFee: row.consultationFee,
    freeFirstConsultation: row.freeFirstConsultation,
    consultationModes: row.consultationModes,
  };
}

// Profile view adds the trust and credential signals the list
// omits to keep the payload slim. `memberSince` is derived from createdAt
// so the raw timestamp never leaves the API.
export function toPublicLawyerDetail(
  row: LawyerRow,
  env: Env,
  origin: string,
): TPublicLawyerDetail {
  return {
    ...toPublicLawyer(row, env, origin),
    barNumber: row.barNumber,
    firmName: row.firmName,
    courts: row.courts,
    education: row.education,
    barEnrollmentYear: row.barEnrollmentYear,
    memberSince: new Date(row.createdAt).getFullYear(),
  };
}

// Catalog slice is small (mock 50–100), so ranking/pagination stays in memory.
export async function searchLawyers(
  db: Db,
  query: TLawyerSearchQuery,
  env: Env,
  origin: string,
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
  return {
    lawyers: page.map((row) => toPublicLawyer(row, env, origin)),
    meta,
  };
}

export async function findPublicLawyer(
  db: Db,
  id: string,
  env: Env,
  origin: string,
): Promise<TPublicLawyerDetail | null> {
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
  return row ? toPublicLawyerDetail(row, env, origin) : null;
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
