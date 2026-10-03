import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TAdminUserUpdate } from "@vidhan/schema";
import { listUsers, updateUserSubscription } from "./api";

export const userKeys = {
  all: ["users"] as const,
  list: (page: number, search: string) =>
    [...userKeys.all, "list", page, search] as const,
};

export function useUsers(page: number, search: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(page, search),
    queryFn: () => listUsers({ page, search }),
    enabled,
  });
}

export type TUpdateSubscriptionVariables = {
  id: string;
  patch: TAdminUserUpdate;
};

export function useUpdateUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: TUpdateSubscriptionVariables) =>
      updateUserSubscription(id, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
