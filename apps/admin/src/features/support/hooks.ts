import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TSupportTicketStatus } from "@vidhan/schema";
import {
  getSupportTicket,
  listSupportTickets,
  replyToSupportTicket,
  updateSupportTicketStatus,
} from "./api";

export const supportKeys = {
  all: ["support-tickets"] as const,
  list: (status?: TSupportTicketStatus) =>
    [...supportKeys.all, "list", status ?? "all"] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
};

export function useSupportTickets(
  status?: TSupportTicketStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: supportKeys.list(status),
    queryFn: () => listSupportTickets(status),
    enabled,
  });
}

export function useSupportTicket(id: string | null) {
  return useQuery({
    queryKey: supportKeys.detail(id ?? ""),
    queryFn: () => getSupportTicket(id as string),
    enabled: id !== null,
  });
}

export function useReplyToSupportTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => replyToSupportTicket(id, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

export function useUpdateSupportTicketStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TSupportTicketStatus) =>
      updateSupportTicketStatus(id, status),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}
