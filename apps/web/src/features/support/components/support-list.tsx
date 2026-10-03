"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import type { TSupportTicket } from "@vidhan/schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { listTickets } from "../api";
import { categoryLabel, formatDate, statusLabel } from "../labels";
import { NewTicketForm } from "./new-ticket-form";

export function SupportList() {
  const [tickets, setTickets] = React.useState<TSupportTicket[] | null>(null);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setError(false);
    listTickets()
      .then((result) => {
        if (active) setTickets(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      <NewTicketForm onCreated={() => setReloadKey((key) => key + 1)} />

      {error ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-8 text-center">
          <p className="text-[15px] text-muted-foreground">
            Could not load your tickets.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </Button>
        </div>
      ) : tickets === null ? (
        <p className="text-[15px] text-muted-foreground">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-10 text-center">
          <LifeBuoy className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-[15px] text-muted-foreground">
            No tickets yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-[var(--radius)] border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/support?id=${ticket.id}`}
                    className="text-[17px] font-bold tracking-tight hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
                    <span>{categoryLabel(ticket.category)}</span>
                    <span>Updated {formatDate(ticket.updatedAt)}</span>
                  </p>
                </div>
                <Badge variant={ticket.status === "open" ? "accent" : "outline"}>
                  {statusLabel(ticket.status)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
