"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

import type { TPublicLawyerRequest } from "@vidhan/schema";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  consultationModeLabel,
  requestStatusLabel,
} from "@/features/lawyers/labels";
import { getMyLawyerRequests } from "@/features/lawyers/requests-api";

type TBadgeVariant = "secondary" | "accent" | "outline";

const STATUS_VARIANTS: Record<TPublicLawyerRequest["status"], TBadgeVariant> = {
  pending: "accent",
  contacted: "secondary",
  closed: "outline",
};

export default function RequestsPage() {
  const [requests, setRequests] = React.useState<
    TPublicLawyerRequest[] | null
  >(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getMyLawyerRequests()
      .then((result) => {
        if (active) setRequests(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
      <PageHeader
        title="My requests"
        description="Callbacks you've asked Vidhan to arrange. We update the status as we follow up."
      />

      {error ? (
        <p className="text-[15px] text-muted-foreground">
          Could not load your requests. Try again later.
        </p>
      ) : requests === null ? (
        <p className="text-[15px] text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-10 text-center">
          <p className="text-[15px] text-muted-foreground">
            No requests yet.
          </p>
          <Button asChild className="mt-4">
            <Link href="/lawyers">Find a lawyer</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-[var(--radius)] border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/lawyers/${request.lawyerId}`}
                    className="text-[17px] font-bold tracking-tight hover:underline"
                  >
                    {request.lawyerName}
                  </Link>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" />
                      {request.preferredTime}
                    </span>
                    {request.mode && (
                      <span>{consultationModeLabel(request.mode)}</span>
                    )}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[request.status]}>
                  {requestStatusLabel(request.status)}
                </Badge>
              </div>
              {request.note && (
                <p className="mt-3 text-[15px] text-foreground/80">
                  {request.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
