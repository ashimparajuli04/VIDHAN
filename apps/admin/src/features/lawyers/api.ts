import { z } from "zod/v4";
import { ZLawyer } from "@vidhan/schema";
import type { TLawyer, TLawyerUpdate } from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZLawyerList = z.object({ lawyers: z.array(ZLawyer) });
const ZLawyerEnvelope = z.object({ lawyer: ZLawyer });

export async function listLawyers(active?: boolean): Promise<TLawyer[]> {
  const payload = await apiFetch("/admin/lawyers", {
    query: active === undefined ? {} : { active },
  });
  return ZLawyerList.parse(payload).lawyers;
}

export async function updateLawyer(
  id: string,
  patch: TLawyerUpdate,
): Promise<TLawyer> {
  const payload = await apiFetch(`/admin/lawyers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return ZLawyerEnvelope.parse(payload).lawyer;
}

export async function checkCredentials(): Promise<void> {
  await apiFetch("/admin/stats");
}
