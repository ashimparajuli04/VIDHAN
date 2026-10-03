"use client";

import * as React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import type {
  TEnterpriseMembership,
  TEnterpriseOrganizationDetail,
} from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

import { EnterpriseOrganization } from "@/features/enterprise/components/enterprise-organization";
import { getMembership, getOrganization } from "@/features/enterprise/api";

export default function EnterprisePage() {
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "failed" }
    | { kind: "none" }
    | {
        kind: "ready";
        membership: TEnterpriseMembership;
        organization: TEnterpriseOrganizationDetail;
      }
  >({ kind: "loading" });

  function load() {
    setState({ kind: "loading" });
    Promise.all([getMembership(), getOrganization()])
      .then(([membership, organization]) => {
        if (!membership || !organization) {
          setState({ kind: "none" });
          return;
        }
        setState({ kind: "ready", membership, organization });
      })
      .catch(() => setState({ kind: "failed" }));
  }

  React.useEffect(load, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
      <PageHeader
        title="Enterprise"
        description="Manage your organization's Vidhan access."
      />

      {state.kind === "loading" ? (
        <p className="text-[15px] text-muted-foreground">Loading…</p>
      ) : state.kind === "failed" ? (
        <div className="space-y-3">
          <p className="text-[15px] text-muted-foreground">
            Could not load your organization.
          </p>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-border bg-card px-5 py-2 text-[15px] font-medium hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : state.kind === "none" ? (
        <Card className="rounded-[var(--radius)]">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="size-6 text-primary" />
            </div>
            <CardTitle className="mt-4">Not part of an Enterprise yet</CardTitle>
            <CardDescription className="text-[15px]">
              Your organization's Enterprise request hasn't been approved, or
              you're not on its member list yet. The Vidhan team reviews each
              request and activates access after approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/enterprise/request">View your Enterprise request</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <EnterpriseOrganization
          organization={state.organization}
          isAdmin={state.membership.role === "admin"}
          onChanged={load}
        />
      )}
    </main>
  );
}