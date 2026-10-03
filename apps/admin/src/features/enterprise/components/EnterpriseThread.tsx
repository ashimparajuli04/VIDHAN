"use client";

import { useState } from "react";

import {
  useReplyToSupportTicket,
  useSupportTicket,
} from "@/features/support/hooks";
import { formatDate } from "@/features/support/labels";

// The support conversation attached to an Enterprise request. Reuses the
// existing support infrastructure — replies land in the same thread the
// requester reads on their Support page.
export function EnterpriseThread({
  ticketId,
  onReplied,
}: {
  ticketId: string | null;
  onReplied?: () => void;
}) {
  const [reply, setReply] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useSupportTicket(ticketId);
  const replyMutation = useReplyToSupportTicket(ticketId ?? "");

  if (query.isLoading) {
    return <p className="text-sm text-slate-500">Loading conversation…</p>;
  }
  if (query.error) {
    return <p className="text-sm text-red-600">Failed to load conversation.</p>;
  }
  const ticket = query.data;
  if (!ticket) return null;

  function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body) return;
    setActionError(null);
    replyMutation.mutate(body, {
      onSuccess: () => {
        setReply("");
        onReplied?.();
      },
      onError: () =>
        setActionError(
          replyMutation.error instanceof Error
            ? `Reply failed (${replyMutation.error.message}).`
            : "Reply failed.",
        ),
    });
  }

  return (
    <div>
      <ul className="space-y-3">
        {ticket.messages.map((message) => {
          const isAdmin = message.authorRole === "admin";
          return (
            <li
              key={message.id}
              className={`rounded-md border p-3 ${
                isAdmin
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isAdmin ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {isAdmin ? "Vidhan admin" : ticket.user.name} ·{" "}
                {formatDate(message.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
            </li>
          );
        })}
      </ul>

      {actionError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <form onSubmit={handleReply} className="mt-4 space-y-2">
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Reply to the requester…"
          rows={3}
          maxLength={4000}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={replyMutation.isPending || !reply.trim()}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {replyMutation.isPending ? "Sending…" : "Send reply"}
        </button>
      </form>
    </div>
  );
}