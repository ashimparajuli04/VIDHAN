"use client";

import * as React from "react";
import { LifeBuoy } from "lucide-react";

import type { TSupportTicketCategory } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createTicket, SupportApiError } from "../api";
import { categoryLabel } from "../labels";

const CATEGORIES: TSupportTicketCategory[] = [
  "missing_document",
  "missing_lawyer",
  "other",
];

export function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [category, setCategory] = React.useState<TSupportTicketCategory>("other");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setSubject("");
    setMessage("");
    setCategory("other");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError("Describe the issue before filing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createTicket({
        subject: subject.trim() || undefined,
        message: message.trim(),
        category,
        source: "support_page",
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(
        err instanceof SupportApiError && err.status === 0
          ? "Could not reach the server. Try again."
          : "Could not file the ticket. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <LifeBuoy />
        New ticket
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius)] border border-border bg-card p-5"
    >
      <h2 className="text-[17px] font-bold tracking-tight">New ticket</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Tell us what went wrong and an admin will reply here.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-subject" className="text-[14px] font-medium">
            Subject <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Short summary"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-category" className="text-[14px] font-medium">
            Category
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as TSupportTicketCategory)
            }
            className="h-11 w-full rounded-full border border-border bg-white px-5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 dark:bg-white/[0.06]"
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-message" className="text-[14px] font-medium">
            Message
          </label>
          <Textarea
            id="ticket-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What are you trying to do, and what is missing?"
            rows={5}
            maxLength={4000}
          />
        </div>

        {error && <p className="text-[14px] text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Filing…" : "File ticket"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
