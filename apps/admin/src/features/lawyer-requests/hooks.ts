import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TLawyerRequestStatusUpdate } from "@vidhan/schema";
import { listLawyerRequests, updateLawyerRequestStatus } from "./api";

export const lawyerRequestKeys = {
  all: ["lawyer-requests"] as const,
};

export function useLawyerRequests(enabled = true) {
  return useQuery({
    queryKey: lawyerRequestKeys.all,
    queryFn: listLawyerRequests,
    enabled,
  });
}

export type TUpdateStatusVariables = {
  id: string;
  patch: TLawyerRequestStatusUpdate;
};

export function useUpdateLawyerRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: TUpdateStatusVariables) =>
      updateLawyerRequestStatus(id, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: lawyerRequestKeys.all });
    },
  });
}
