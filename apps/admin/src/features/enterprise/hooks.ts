import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TEnterpriseApprovalConfig,
  TEnterpriseRequestStatus,
} from "@vidhan/schema";
import {
  approveEnterpriseRequest,
  getEnterpriseOrganization,
  getEnterpriseRequest,
  listEnterpriseOrganizations,
  listEnterpriseRequests,
  updateEnterpriseRequestStatus,
} from "./api";

export const enterpriseKeys = {
  all: ["enterprise"] as const,
  requests: (status?: TEnterpriseRequestStatus) =>
    [...enterpriseKeys.all, "requests", status ?? "all"] as const,
  requestDetail: (id: string) =>
    [...enterpriseKeys.all, "request", id] as const,
  organizations: ["enterprise", "organizations"] as const,
  organization: (id: string) =>
    [...enterpriseKeys.all, "organization", id] as const,
};

export function useEnterpriseRequests(
  status?: TEnterpriseRequestStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: enterpriseKeys.requests(status),
    queryFn: () => listEnterpriseRequests(status),
    enabled,
  });
}

export function useEnterpriseRequest(id: string | null) {
  return useQuery({
    queryKey: enterpriseKeys.requestDetail(id ?? ""),
    queryFn: () => getEnterpriseRequest(id as string),
    enabled: id !== null,
  });
}

export function useUpdateEnterpriseRequestStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TEnterpriseRequestStatus) =>
      updateEnterpriseRequestStatus(id, status),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
    },
  });
}

export function useApproveEnterpriseRequest(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: TEnterpriseApprovalConfig) =>
      approveEnterpriseRequest(id, config),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
    },
  });
}

export function useEnterpriseOrganizations(enabled = true) {
  return useQuery({
    queryKey: enterpriseKeys.organizations,
    queryFn: listEnterpriseOrganizations,
    enabled,
  });
}

export function useEnterpriseOrganization(id: string | null) {
  return useQuery({
    queryKey: enterpriseKeys.organization(id ?? ""),
    queryFn: () => getEnterpriseOrganization(id as string),
    enabled: id !== null,
  });
}