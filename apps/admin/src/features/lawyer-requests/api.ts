import { z } from "zod/v4";
import { ZAdminLawyerRequest } from "@vidhan/schema";
import type {
  TAdminLawyerRequest,
  TLawyerRequestStatusUpdate,
} from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZLawyerRequestList = z.object({ requests: z.array(ZAdminLawyerRequest) });
const ZLawyerRequestEnvelope = z.object({ request: ZAdminLawyerRequest });

export async function listLawyerRequests(): Promise<TAdminLawyerRequest[]> {
  const payload = await apiFetch("/admin/lawyer-requests");
  return ZLawyerRequestList.parse(payload).requests;
}

export async function updateLawyerRequestStatus(
  id: string,
  input: TLawyerRequestStatusUpdate,
): Promise<TAdminLawyerRequest> {
  const payload = await apiFetch(
    `/admin/lawyer-requests/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  );
  return ZLawyerRequestEnvelope.parse(payload).request;
}
