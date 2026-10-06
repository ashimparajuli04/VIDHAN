"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TSupportTicket, TSupportTicketCategory } from "@vidhan/schema";

import { createTicket } from "@/features/support/api";
import { categoryLabel } from "@/features/support/labels";

import type { TSupportOffer } from "../types";
import {
  dismissOffer,
  isOfferDismissed,
  supportOfferKey,
} from "../support-offer-storage";

// A "missing lawyer" offer is a request to expand the directory, not a bug
// report, so the card says what it is for.
const OFFER_COPY: Record<
  TSupportTicketCategory,
  { title: string; action: string }
> = {
  missing_lawyer: {
    title: "Request a lawyer in your district?",
    action: "Request a lawyer",
  },
  missing_document: {
    title: "Request this provision be added?",
    action: "Request provision",
  },
  other: {
    title: "Report this to the team?",
    action: "File a ticket",
  },
};

// Files nothing until the user clicks; the button then disables. A reloaded
// chat re-renders the card, so the server-side dedupe on the ticket body is
// what stops a second click from filing a duplicate.
export function SupportOfferCard({ offer }: { offer: TSupportOffer }) {
  const copy = OFFER_COPY[offer.category];
  const [ticket, setTicket] = React.useState<TSupportTicket | null>(null);
  const [pending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const dismissalKey = supportOfferKey(offer);

  // Read after mount: the static export renders with no localStorage.
  React.useEffect(() => {
    if (isOfferDismissed(dismissalKey)) setDismissed(true);
  }, [dismissalKey]);

  function dismiss() {
    setDismissed(true);
    dismissOffer(dismissalKey);
  }

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

  if (dismissed) return null;

  return (
    <div className="relative w-full rounded-[var(--radius)] border border-border bg-card p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={dismiss}
        aria-label="Dismiss offer"
        title="Close"
        className="absolute right-2 top-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        <X className="size-4" />
      </Button>
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{copy.title}</p>
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
              {pending ? "Filing…" : copy.action}
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
