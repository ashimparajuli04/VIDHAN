"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { TEnterpriseRequest } from "@vidhan/schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { capabilityLabel, formatDate, requestStatusLabel } from "../labels";

const TERMINAL_STATUSES = ["rejected", "closed"] as const;

export function isTerminalRequest(
  request: TEnterpriseRequest | null,
): boolean {
  if (!request) return false;
  return (TERMINAL_STATUSES as readonly string[]).includes(request.status);
}

export function RequestOverview({ request }: { request: TEnterpriseRequest }) {
  const approved = request.approvedSeats !== null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{request.organizationName}</CardTitle>
              <CardDescription>
                Enterprise request · filed {formatDate(request.createdAt)}
              </CardDescription>
            </div>
            <Badge
              variant={
                request.status === "approved" || request.status === "active"
                  ? "accent"
                  : "outline"
              }
            >
              {requestStatusLabel(request.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-[15px]">
          <p className="leading-relaxed text-muted-foreground">
            The Vidhan team reviews each Enterprise request against the
            organization's needs. Requirements are confirmed before anything
            is approved — nothing above is guaranteed until the team replies.
          </p>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Expected users</dt>
              <dd className="text-muted-foreground">
                {request.expectedUsers}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Intended use</dt>
              <dd className="text-muted-foreground">{request.intendedUse}</dd>
            </div>
            <div>
              <dt className="font-medium">Expected start</dt>
              <dd className="text-muted-foreground">
                {request.expectedStartDate}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Teams / departments</dt>
              <dd className="text-muted-foreground">
                {request.teamsDepartments}
              </dd>
            </div>
          </dl>

          <div>
            <p className="font-medium">Requested capabilities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {request.requestedCapabilities.map((capability) => (
                <Badge key={capability} variant="secondary">
                  {capabilityLabel(capability)}
                </Badge>
              ))}
            </div>
          </div>

          {approved && (
            <div className="rounded-[var(--radius)] bg-muted p-4">
              <p className="font-medium">Approved allocation</p>
              <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt className="text-[14px] text-muted-foreground">
                    Seats
                  </dt>
                  <dd className="font-semibold">{request.approvedSeats}</dd>
                </div>
                <div>
                  <dt className="text-[14px] text-muted-foreground">
                    Tokens / member
                  </dt>
                  <dd className="font-semibold">
                    {request.approvedTokensPerMember?.toLocaleString("en-US")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[14px] text-muted-foreground">
                    Start date
                  </dt>
                  <dd className="font-semibold">
                    {request.approvedStartDate ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      {request.supportTicketId ? (
        <Card className="bg-muted">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">Conversation with the Vidhan team</p>
              <p className="text-[14px] text-muted-foreground">
                Clarification and status updates happen in your existing
                Support conversation.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/support?id=${request.supportTicketId}`}>
                Open in Support
                <ArrowUpRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}