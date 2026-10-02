import { ZPublicLawyer } from "@vidhan/schema";
import type { TPublicLawyer } from "@vidhan/schema";

import { apiGet } from "@/lib/api";

// ───────────────────────── Query contract ─────────────────────────
// Maps 1:1 onto the GET /lawyers query string params. `search` has no
// server-side counterpart yet, so it is applied client-side in getLawyers.

export interface LawyerQuery {
  search?: string;
  practiceArea?: string;
  district?: string;
  language?: string;
}

const MAX_RESULTS = 50;

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

  const lawyers = payload.lawyers.map((item) => ZPublicLawyer.parse(item));

  const search = query.search?.trim().toLowerCase();
  if (!search) return lawyers;

  return lawyers.filter(
    (lawyer) =>
      lawyer.name.toLowerCase().includes(search) ||
      lawyer.practiceAreas.some((area) => area.includes(search))
  );
}