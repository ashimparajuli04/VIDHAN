"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TEnterpriseRequestStatus } from "@vidhan/schema";
import { ApiError } from "@/lib/api";
import { clearCreds, hasCreds } from "@/lib/auth";
import { EnterpriseRequestDetail } from "@/features/enterprise/components/EnterpriseRequestDetail";
import { EnterpriseRequestsTable } from "@/features/enterprise/components/EnterpriseRequestsTable";
import { OrganizationDetail } from "@/features/enterprise/components/OrganizationDetail";
import { OrganizationsTable } from "@/features/enterprise/components/OrganizationsTable";
import { useEnterpriseOrganizations, useEnterpriseRequests } from "@/features/enterprise/hooks";

type TTab = "requests" | "organizations";

export default function EnterprisePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TTab>("requests");
  const [status, setStatus] = useState<TEnterpriseRequestStatus | undefined>(
    undefined,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requestsQuery = useEnterpriseRequests(status, ready && tab === "requests");
  const organizationsQuery = useEnterpriseOrganizations(
    ready && tab === "organizations",
  );
  const query = tab === "requests" ? requestsQuery : organizationsQuery;
  const unauthorized =
    query.error instanceof ApiError && query.error.unauthorized;

  useEffect(() => {
    if (hasCreds()) setReady(true);
    else router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (unauthorized) {
      clearCreds();
      router.replace("/login");
    }
  }, [unauthorized, router]);

  if (!ready) return null;

  if (selectedId) {
    return tab === "requests" ? (
      <EnterpriseRequestDetail
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    ) : (
      <OrganizationDetail id={selectedId} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Enterprise
          </h1>
          <p className="text-sm text-slate-500">
            Review requests, approve allocations, and manage organizations.
          </p>
        </div>
        {tab === "requests" && (
          <select
            value={status ?? "all"}
            onChange={(event) =>
              setStatus(
                event.target.value === "all"
                  ? undefined
                  : (event.target.value as TEnterpriseRequestStatus),
              )
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="awaiting_customer">Awaiting customer</option>
            <option value="negotiation">Quote / negotiation</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
        )}
      </header>

      <div className="mb-4 flex gap-1 rounded-md border border-slate-200 bg-white p-1 w-fit">
        {(
          [
            { value: "requests", label: "Requests" },
            { value: "organizations", label: "Organizations" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setTab(option.value);
              setSelectedId(null);
            }}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === option.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : query.error && !unauthorized ? (
        <p className="text-sm text-red-600">Failed to load data.</p>
      ) : tab === "requests" ? (
        <EnterpriseRequestsTable
          requests={requestsQuery.data ?? []}
          onOpen={setSelectedId}
        />
      ) : (
        <OrganizationsTable
          organizations={organizationsQuery.data ?? []}
          onOpen={setSelectedId}
        />
      )}
    </main>
  );
}