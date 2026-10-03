import { ZPublicLawyer, ZPublicLawyerDetail } from "@vidhan/schema";
import type { TPublicLawyer, TPublicLawyerDetail } from "@vidhan/schema";

import { apiGet } from "@/lib/api";

// ───────────────────────── Query contract ─────────────────────────
// Maps 1:1 onto the GET /lawyers query string params. `search` has no
// server-side counterpart, so it is applied client-side in getLawyers.

export interface LawyerQuery {
  search?: string;
  practiceArea?: string;
  district?: string;
  language?: string;
}

// The catalogue fetches the whole set once (mirrors the docs repository);
// the API caps at MAX_LIMIT, so keep the two in step.
const MAX_RESULTS = 200;

export async function getLawyers(
  query: LawyerQuery
): Promise<TPublicLawyer[]> {
  const params = new URLSearchParams();
  if (query.practiceArea) params.set("practiceArea", query.practiceArea);
  if (query.district) params.set("district", query.district);
  if (query.language) params.set("language", query.language);
  params.set("limit", String(MAX_RESULTS));

  const payload = (await apiGet(`/lawyers?${params}`)) as {
    lawyers?: unknown;
  };
  if (!Array.isArray(payload.lawyers)) throw new Error("invalid_response");
  let lawyers = payload.lawyers.map((item) => ZPublicLawyer.parse(item));

  const search = query.search?.trim().toLowerCase();
  if (!search) return lawyers;

  return lawyers.filter(
    (lawyer) =>
      lawyer.name.toLowerCase().includes(search) ||
      lawyer.practiceAreas.some((area) => area.includes(search))
  );
}

export async function getLawyer(
  id: string
): Promise<TPublicLawyerDetail | null> {
  const payload = (await apiGet(`/lawyers/${encodeURIComponent(id)}`)) as {
    lawyer?: unknown;
  };
  if (!payload.lawyer) return null;
  return ZPublicLawyerDetail.parse(payload.lawyer);
}

// Static export needs every route's params at build time, and the seed
// lawyer ids are deterministic (seed-001 … seed-080). Swap this for the
// real id source when the API becomes the source of truth for builds.
export const LAWYER_IDS: string[] = Array.from(
  { length: 80 },
  (_, index) => `seed-${String(index + 1).padStart(3, "0")}`,
);