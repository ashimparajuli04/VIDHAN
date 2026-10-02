import { z } from "zod/v4";
import { ZLawyerWithImage } from "@vidhan/schema";
import type {
  TLawyerCreate,
  TLawyerUpdate,
  TLawyerWithImage,
} from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZLawyerList = z.object({ lawyers: z.array(ZLawyerWithImage) });
const ZLawyerEnvelope = z.object({ lawyer: ZLawyerWithImage });

export async function listLawyers(
  active?: boolean,
): Promise<TLawyerWithImage[]> {
  const payload = await apiFetch("/admin/lawyers", {
    query: active === undefined ? {} : { active },
  });
  return ZLawyerList.parse(payload).lawyers;
}

export async function createLawyer(
  input: TLawyerCreate,
): Promise<TLawyerWithImage> {
  const payload = await apiFetch("/admin/lawyers", {
    method: "POST",
    body: input,
  });
  return ZLawyerEnvelope.parse(payload).lawyer;
}

export async function updateLawyer(
  id: string,
  patch: TLawyerUpdate,
): Promise<TLawyerWithImage> {
  const payload = await apiFetch(`/admin/lawyers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return ZLawyerEnvelope.parse(payload).lawyer;
}

export async function checkCredentials(): Promise<void> {
  await apiFetch("/admin/stats");
}
