"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TSupportTicket } from "@vidhan/schema";

import { createTicket } from "@/features/support/api";
import { categoryLabel } from "@/features/support/labels";

import type { TSupportOffer } from "../types";

// Files nothing until the user clicks; the button then disables. A reloaded
// chat re-renders the card, so the server-side dedupe on the ticket body is
// what stops a second click from filing a duplicate.
export function SupportOfferCard({ offer }: { offer: TSupportOffer }) {
  const [ticket, setTicket] = React.useState<TSupportTicket | null>(null);
  const [pending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  async function fileTicket() {
    setPending(true);
    setFailed(false);
    try {
      const created = await createTicket({
        message: offer.message,
        category: offer.category,
        source: "chat",
      });
      setTicket(created);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">
            Report this to the team?
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
            {offer.reason || "The assistant could not fully resolve this."}
          </p>
          <p className="mt-2 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
            {offer.message}
          </p>

          {ticket ? (
            <Button asChild size="sm" className="mt-3">
              <Link href={`/support?id=${ticket.id}`}>View ticket</Link>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={pending}
              onClick={fileTicket}
            >
              {pending ? "Filing…" : "File a ticket"}
            </Button>
          )}

          {failed && (
            <p className="mt-2 text-[13px] text-destructive">
              Could not file the ticket. Try again.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[12px] uppercase tracking-wide text-muted-foreground">
        {categoryLabel(offer.category)}
      </p>
    </div>
  );
}
