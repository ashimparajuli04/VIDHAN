import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TLawyer, TLawyerUpdate } from "@vidhan/schema";
import { listLawyers, updateLawyer } from "./api";

export const lawyerKeys = {
  all: ["lawyers"] as const,
  list: (active?: boolean) =>
    [...lawyerKeys.all, "list", active ?? "all"] as const,
};

export function useLawyers(active?: boolean, enabled = true) {
  return useQuery({
    queryKey: lawyerKeys.list(active),
    queryFn: () => listLawyers(active),
    enabled,
  });
}

export type TUpdateVariables = { id: string; patch: TLawyerUpdate };

export function useUpdateLawyer(active?: boolean) {
  const queryClient = useQueryClient();
  const queryKey = lawyerKeys.list(active);

  return useMutation({
    mutationFn: ({ id, patch }: TUpdateVariables) => updateLawyer(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TLawyer[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<TLawyer[]>(
          queryKey,
          previous.map((lawyer) =>
            lawyer.id === id ? { ...lawyer, ...patch } : lawyer,
          ),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData<TLawyer[]>(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}
