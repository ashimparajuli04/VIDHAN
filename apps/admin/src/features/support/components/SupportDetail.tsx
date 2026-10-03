"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  useReplyToSupportTicket,
  useSupportTicket,
  useUpdateSupportTicketStatus,
} from "../hooks";
import { categoryLabel, formatDate, sourceLabel, statusLabel } from "../labels";

export function SupportDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [reply, setReply] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useSupportTicket(id);
  const replyMutation = useReplyToSupportTicket(id);
  const statusMutation = useUpdateSupportTicketStatus(id);

  const unauthorized =
    (query.error instanceof ApiError && query.error.unauthorized) ||
    (replyMutation.error instanceof ApiError &&
      replyMutation.error.unauthorized) ||
    (statusMutation.error instanceof ApiError &&
      statusMutation.error.unauthorized);

  if (query.isLoading) {
    return <p className="mx-auto max-w-3xl px-6 py-8 text-sm text-slate-500">Loading…</p>;
  }
  if (query.error && !unauthorized) {
    return (
      <p className="mx-auto max-w-3xl px-6 py-8 text-sm text-red-600">
        Failed to load ticket.
      </p>
    );
  }

  const ticket = query.data;
  if (!ticket) return null;

  const nextStatus = ticket.status === "open" ? "closed" : "open";

  function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body) return;
    setActionError(null);
    replyMutation.mutate(body, {
      onSuccess: () => setReply(""),
      onError: () =>
        setActionError(
          replyMutation.error instanceof ApiError
            ? `Reply failed (${replyMutation.error.code}).`
            : "Reply failed.",
        ),
    });
  }

  function handleToggleStatus() {
    setActionError(null);
    statusMutation.mutate(nextStatus, {
      onError: () =>
        setActionError(
          statusMutation.error instanceof ApiError
            ? `Update failed (${statusMutation.error.code}).`
            : "Update failed.",
        ),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-slate-500 hover:text-slate-900"
      >
        ← All tickets
      </button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {categoryLabel(ticket.category)} · {sourceLabel(ticket.source)} ·{" "}
            {statusLabel(ticket.status)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {ticket.user.name}{" "}
            <span className="text-slate-500">{ticket.user.email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={statusMutation.isPending}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          {nextStatus === "closed" ? "Close ticket" : "Reopen ticket"}
        </button>
      </header>

      {actionError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <ul className="space-y-4">
        {ticket.messages.map((message) => {
          const isAdmin = message.authorRole === "admin";
          return (
            <li
              key={message.id}
              className={`rounded-md border p-4 ${
                isAdmin
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isAdmin ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {isAdmin ? "Admin" : ticket.user.name} ·{" "}
                {formatDate(message.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleReply} className="mt-6 space-y-3">
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Reply to the user…"
          rows={4}
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
    </main>
  );
}
