import { z } from "zod/v4";
import {
  ZAdminEnterpriseOrganization,
  ZAdminEnterpriseRequest,
  ZAdminEnterpriseRequestDetail,
  ZEnterpriseApprovalConfig,
  ZEnterpriseOrganization,
  ZEnterpriseOrganizationDetail,
  ZEnterpriseRequest,
} from "@vidhan/schema";
import type {
  TAdminEnterpriseOrganization,
  TAdminEnterpriseRequest,
  TAdminEnterpriseRequestDetail,
  TEnterpriseApprovalConfig,
  TEnterpriseOrganization,
  TEnterpriseOrganizationDetail,
  TEnterpriseRequestStatus,
} from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZRequestList = z.object({ requests: z.array(ZAdminEnterpriseRequest) });
const ZRequestEnvelope = z.object({ request: ZAdminEnterpriseRequestDetail });
const ZStatusEnvelope = z.object({ request: ZEnterpriseRequest });
const ZOrgList = z.object({
  organizations: z.array(ZAdminEnterpriseOrganization),
});
const ZOrgEnvelope = z.object({ organization: ZEnterpriseOrganizationDetail });
const ZApproveEnvelope = z.object({ organization: ZEnterpriseOrganization });

export async function listEnterpriseRequests(
  status?: TEnterpriseRequestStatus,
): Promise<TAdminEnterpriseRequest[]> {
  const payload = await apiFetch("/admin/enterprise/requests", {
    query: status === undefined ? {} : { status },
  });
  return ZRequestList.parse(payload).requests;
}

export async function getEnterpriseRequest(
  id: string,
): Promise<TAdminEnterpriseRequestDetail> {
  const payload = await apiFetch(
    `/admin/enterprise/requests/${encodeURIComponent(id)}`,
  );
  return ZRequestEnvelope.parse(payload).request;
}

export async function updateEnterpriseRequestStatus(
  id: string,
  status: TEnterpriseRequestStatus,
): Promise<void> {
  const payload = await apiFetch(
    `/admin/enterprise/requests/${encodeURIComponent(id)}`,
    { method: "PATCH", body: { status } },
  );
  // The returned request is a projection without user info; detail queries
  // refetch the full record, so the envelope is only validated here.
  ZStatusEnvelope.parse(payload);
}

export async function approveEnterpriseRequest(
  id: string,
  config: TEnterpriseApprovalConfig,
): Promise<TEnterpriseOrganization> {
  const payload = await apiFetch(
    `/admin/enterprise/requests/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: config },
  );
  return ZApproveEnvelope.parse(payload).organization;
}

export async function listEnterpriseOrganizations(): Promise<
  TAdminEnterpriseOrganization[]
> {
  const payload = await apiFetch("/admin/enterprise/organizations");
  return ZOrgList.parse(payload).organizations;
}

export async function getEnterpriseOrganization(
  id: string,
): Promise<TEnterpriseOrganizationDetail> {
  const payload = await apiFetch(
    `/admin/enterprise/organizations/${encodeURIComponent(id)}`,
  );
  return ZOrgEnvelope.parse(payload).organization;
}