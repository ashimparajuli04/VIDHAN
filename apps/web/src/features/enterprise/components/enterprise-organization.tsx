"use client";

import * as React from "react";
import { Building2, Loader2, UserPlus } from "lucide-react";

import type {
  TEnterpriseMemberView,
  TEnterpriseOrganizationDetail,
} from "@vidhan/schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { formatTokenCount } from "@/features/plans/plans";

import {
  addEnterpriseMember,
  EnterpriseApiError,
  updateEnterpriseMemberStatus,
} from "../api";

const ACTIVE_STATUSES = ["active", "invited"] as const;

function memberLabel(member: TEnterpriseMemberView): string {
  return member.userName ?? member.email;
}

function MemberStatusBadge({ status }: { status: TEnterpriseMemberView["status"] }) {
  return (
    <Badge variant={status === "active" ? "accent" : "outline"}>
      {status === "active" ? "Active" : status === "invited" ? "Invited" : "Removed"}
    </Badge>
  );
}

export function EnterpriseOrganization({
  organization,
  isAdmin,
  onChanged,
}: {
  organization: TEnterpriseOrganizationDetail;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [notice, setNotice] = React.useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const seatsUsed = organization.members.filter((member) =>
    ACTIVE_STATUSES.includes(member.status as (typeof ACTIVE_STATUSES)[number]),
  ).length;
  const seatsLeft = Math.max(0, organization.approvedSeats - seatsUsed);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || adding) return;
    setAdding(true);
    setNotice(null);
    try {
      const { invited } = await addEnterpriseMember(value);
      setEmail("");
      setNotice({
        kind: "success",
        text: invited
          ? `An invite was sent to ${value}. They join once they sign in to Vidhan.`
          : `${value} was added as an active member.`,
      });
      onChanged();
    } catch (cause) {
      setNotice({
        kind: "error",
        text: memberActionError(cause),
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleSetStatus(
    member: TEnterpriseMemberView,
    status: "active" | "deactivated",
  ) {
    if (busyId) return;
    setBusyId(member.id);
    setNotice(null);
    try {
      await updateEnterpriseMemberStatus(member.id, status);
      onChanged();
    } catch (cause) {
      setNotice({ kind: "error", text: memberActionError(cause) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{organization.name}</CardTitle>
              <CardDescription>
                Enterprise Plan{isAdmin ? " · you are the organization admin" : ""}
              </CardDescription>
            </div>
            <Badge>{isAdmin ? "Admin" : "Member"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[14px] font-medium text-muted-foreground">
              Approved members
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight">
              {seatsUsed} <span className="text-[15px] font-semibold text-muted-foreground">/ {organization.approvedSeats}</span>
            </p>
          </div>
          <div>
            <p className="text-[14px] font-medium text-muted-foreground">
              Token allocation
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight">
              {formatTokenCount(organization.tokensPerMember)}{" "}
              <span className="text-[15px] font-semibold text-muted-foreground">
                tokens / member
              </span>
            </p>
          </div>
          <div>
            <p className="text-[14px] font-medium text-muted-foreground">
              Enterprise start date
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight">
              {organization.startDate ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="flex items-center gap-2 font-medium">
              <UserPlus className="size-4" />
              Add a member
            </p>
            <p className="text-[14px] text-muted-foreground">
              {seatsLeft} of {organization.approvedSeats} seats available. An
              existing Vidhan user joins immediately; a new email receives an
              invite that activates when they sign in.
            </p>
            <form onSubmit={handleAdd} className="flex max-w-md gap-2">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
                aria-label="Member email"
                required
              />
              <Button type="submit" disabled={adding || !email.trim()}>
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </form>
            {notice && (
              <p
                role="alert"
                className={
                  notice.kind === "error"
                    ? "text-[14px] text-destructive"
                    : "text-[14px] font-medium text-emerald-600 dark:text-emerald-500"
                }
              >
                {notice.text}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Enterprise members
          </CardTitle>
          <CardDescription>
            {seatsUsed} / {organization.approvedSeats} seats used. Every active
            member receives the approved allocation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border overflow-x-auto">
            {organization.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {memberLabel(member)}
                    {member.role === "admin" && (
                      <span className="ml-2 text-[13px] font-medium text-muted-foreground">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <p className="text-[14px] font-medium">
                  {formatTokenCount(
                    member.tokensAllocated ?? organization.tokensPerMember,
                  )}{" "}
                  <span className="font-normal text-muted-foreground">tokens</span>
                </p>
                <MemberStatusBadge status={member.status} />
                {isAdmin && member.role !== "admin" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId !== null}
                    onClick={() =>
                      void handleSetStatus(
                        member,
                        member.status === "deactivated" ? "active" : "deactivated",
                      )
                    }
                  >
                    {member.status === "deactivated" ? "Re-add" : "Remove"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function memberActionError(cause: unknown): string {
  if (cause instanceof EnterpriseApiError) {
    switch (cause.code) {
      case "seat_limit_exceeded":
        return "No seats left — the approved seat limit is reached.";
      case "member_exists":
        return "That email is already a member of this organization.";
      case "forbidden":
        return "Only the organization admin can manage members.";
      case "network":
        return "Could not reach the server. Try again.";
      default:
        return "Something went wrong. Try again.";
    }
  }
  return "Something went wrong. Try again.";
}