"use client";

import * as React from "react";

import type { TEnterpriseRequest } from "@vidhan/schema";

import { PageHeader } from "@/components/page-header";

import { listMyRequests } from "@/features/enterprise/api";
import { EnterpriseRequestForm } from "@/features/enterprise/components/enterprise-request-form";
import {
  isTerminalRequest,
  RequestOverview,
} from "@/features/enterprise/components/request-overview";

export default function EnterpriseRequestPage() {
  const [requests, setRequests] = React.useState<TEnterpriseRequest[] | null>(
    null
  );
  const [failed, setFailed] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  function load() {
    setFailed(false);
    setRequests(null);
    listMyRequests()
      .then(setRequests)
      .catch(() => setFailed(true));
  }

  React.useEffect(load, []);

  const current = requests?.[0] ?? null;
  const terminal = isTerminalRequest(current);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
      <PageHeader
        title="Enterprise"
        description="Organization-wide access to Vidhan, negotiated with the Vidhan team."
      />

      {requests === null && !failed ? (
        <p className="text-[15px] text-muted-foreground">Loading…</p>
      ) : failed ? (
        <div className="space-y-3">
          <p className="text-[15px] text-muted-foreground">
            Could not load your Enterprise status.
          </p>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-border bg-card px-5 py-2 text-[15px] font-medium hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : current && !showForm ? (
        <>
          <RequestOverview request={current} />

          {terminal && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-full bg-primary px-5 py-2.5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Submit another request
              </button>
            </div>
          )}
        </>
      ) : (
        <section className="mt-2 space-y-6">
          {current && terminal && (
            <p className="text-[15px] text-muted-foreground">
              Your previous request was not approved. You can submit a new
              one below.
            </p>
          )}

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]">
              Request Enterprise access
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Tell us about your organization and what you need. A Vidhan
              team member reviews the request and replies in your Support
              conversation — the allocation is confirmed there before
              anything is activated.
            </p>
          </div>

          <EnterpriseRequestForm
            onCreated={(request) => {
              setRequests([request]);
              setShowForm(false);
            }}
          />
        </section>
      )}
    </main>
  );
}