"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { TSupportTicketDetail } from "@vidhan/schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { getTicket, replyToTicket } from "../api";
import { categoryLabel, formatDate, statusLabel } from "../labels";

export function SupportThread({ id }: { id: string }) {
  const [ticket, setTicket] = React.useState<TSupportTicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getTicket(id)
      .then((result) => {
        if (!active) return;
        setTicket(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body || !ticket) return;
    setSending(true);
    try {
      await replyToTicket(ticket.id, body);
      setReply("");
      const refreshed = await getTicket(id);
      setTicket(refreshed);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All tickets
      </Link>

      {loading ? (
        <p className="text-[15px] text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-[15px] text-muted-foreground">
          Could not load this ticket.
        </p>
      ) : !ticket ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-10 text-center">
          <p className="text-[15px] text-muted-foreground">Ticket not found.</p>
          <Button asChild className="mt-4">
            <Link href="/support">Back to tickets</Link>
          </Button>
        </div>
      ) : (
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
                {ticket.subject}
              </h1>
              <Badge variant={ticket.status === "open" ? "accent" : "outline"}>
                {statusLabel(ticket.status)}
              </Badge>
            </div>
            <p className="text-[15px] text-muted-foreground">
              {categoryLabel(ticket.category)} · Filed{" "}
              {formatDate(ticket.createdAt)}
            </p>
          </header>

          <ul className="space-y-4">
            {ticket.messages.map((message) => {
              const isUser = message.authorRole === "user";
              return (
                <li
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[18px] px-4 py-3",
                      isUser
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-card"
                    )}
                  >
                    <p className="text-[12px] font-medium opacity-70">
                      {isUser ? "You" : "Support"} ·{" "}
                      {formatDate(message.createdAt)}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleReply} className="space-y-3">
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a reply…"
              rows={3}
              maxLength={4000}
            />
            <Button type="submit" disabled={sending || !reply.trim()}>
              {sending ? "Sending…" : "Reply"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
