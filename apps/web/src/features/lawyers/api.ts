import { ZPublicLawyer } from "@vidhan/schema";
import type { TPublicLawyer } from "@vidhan/schema";
import { apiGet } from "@/lib/api";

export async function listLawyers(): Promise<TPublicLawyer[]> {
  const payload = (await apiGet("/lawyers")) as { lawyers?: unknown };
  if (!Array.isArray(payload.lawyers)) throw new Error("invalid_response");
  return payload.lawyers.map((item) => ZPublicLawyer.parse(item));
}
