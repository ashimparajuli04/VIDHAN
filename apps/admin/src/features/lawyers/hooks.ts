import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TLawyerCreate,
  TLawyerUpdate,
  TLawyerWithImage,
} from "@vidhan/schema";
import { createLawyer, listLawyers, updateLawyer } from "./api";

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

export function useCreateLawyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TLawyerCreate) => createLawyer(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
    },
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
      const previous = queryClient.getQueryData<TLawyerWithImage[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<TLawyerWithImage[]>(
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
        queryClient.setQueryData<TLawyerWithImage[]>(
          queryKey,
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}
