"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ENTERPRISE_REQUEST_STATUSES } from "@vidhan/schema";
import type { TEnterpriseRequestStatus } from "@vidhan/schema";
import { ApiError } from "@/lib/api";
import {
  enterpriseKeys,
  useApproveEnterpriseRequest,
  useEnterpriseRequest,
  useUpdateEnterpriseRequestStatus,
} from "../hooks";
import {
  CAPABILITY_LABELS,
  CONTACT_METHOD_LABELS,
  formatDate,
  REQUEST_STATUS_LABELS,
} from "../labels";
import { EnterpriseThread } from "./EnterpriseThread";

const STATUS_OPTIONS: TEnterpriseRequestStatus[] = [
  ...ENTERPRISE_REQUEST_STATUSES,
];

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EnterpriseRequestDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  const query = useEnterpriseRequest(id);

  const statusMutation = useUpdateEnterpriseRequestStatus(id);
  const approveMutation = useApproveEnterpriseRequest(id);

  const [seats, setSeats] = useState("");
  const [tokens, setTokens] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const unauthorized =
    (query.error instanceof ApiError && query.error.unauthorized) ||
    (statusMutation.error instanceof ApiError &&
      statusMutation.error.unauthorized) ||
    (approveMutation.error instanceof ApiError &&
      approveMutation.error.unauthorized);

  if (query.isLoading) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-slate-500">
        Loading…
      </p>
    );
  }
  if (query.error && !unauthorized) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-red-600">
        Failed to load request.
      </p>
    );
  }

  const request = query.data;
  if (!request) return null;

  const approved = request.approvedSeats !== null;

  function handleStatusChange(value: string) {
    setActionError(null);
    statusMutation.mutate(value as TEnterpriseRequestStatus, {
      onError: () => setActionError("Status update failed."),
    });
  }

  function handleApprove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    approveMutation.mutate(
      {
        approvedSeats: Number(seats),
        approvedTokensPerMember: Number(tokens),
        approvedStartDate: startDate.trim(),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => setNotes(""),
        onError: (error) =>
          setActionError(
            error instanceof ApiError && error.status === 409
              ? "This request was already approved."
              : "Approval failed.",
          ),
      },
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-slate-500 hover:text-slate-900"
      >
        ← All requests
      </button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {request.organizationName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filed {formatDate(request.createdAt)} · expected users:{" "}
            {request.expectedUsers}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {request.userName} <span className="text-slate-500">{request.userEmail}</span>
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          Status
          <select
            value={request.status}
            onChange={(event) => handleStatusChange(event.target.value)}
            disabled={statusMutation.isPending}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </header>

      {actionError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Organization">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Type" value={request.organizationType} />
            <InfoRow label="Industry" value={request.industry} />
            <InfoRow label="Website" value={request.website} />
            <InfoRow label="Country" value={request.country} />
            <InfoRow label="City / location" value={request.city} />
            <InfoRow label="Employees" value={request.employeeCount} />
          </dl>
        </Section>

        <Section title="Contact">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Contact person" value={request.contactName} />
            <InfoRow label="Job title" value={request.contactTitle} />
            <InfoRow label="Work email" value={request.contactEmail} />
            <InfoRow label="Phone" value={request.contactPhone} />
            <InfoRow
              label="Preferred method"
              value={CONTACT_METHOD_LABELS[request.preferredContactMethod]}
            />
          </dl>
        </Section>

        <Section title="Vidhan usage">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Expected users" value={request.expectedUsers} />
            <InfoRow label="Expected start" value={request.expectedStartDate} />
            <div className="col-span-2">
              <InfoRow label="Expected usage" value={request.expectedUsage} />
            </div>
            <div className="col-span-2">
              <InfoRow
                label="Teams / departments"
                value={request.teamsDepartments}
              />
            </div>
            <div className="col-span-2">
              <InfoRow label="Intended use" value={request.intendedUse} />
            </div>
          </dl>
        </Section>

        <Section title="Requested capabilities">
          <div className="flex flex-wrap gap-1.5">
            {request.requestedCapabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {CAPABILITY_LABELS[capability]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Additional requirements</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
            {request.additionalRequirements ?? "—"}
          </p>
        </Section>
      </div>

      <div className="mt-4">
        <Section title={approved ? "Approved allocation" : "Approve Enterprise"}>
          {approved ? (
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Seats
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {request.approvedSeats}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tokens / member
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {request.approvedTokensPerMember?.toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Start date
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {request.approvedStartDate ?? "—"}
                </p>
              </div>
              {request.adminNotes && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap">{request.adminNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleApprove} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Approved seats</span>
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(event) => setSeats(event.target.value)}
                  placeholder={String(request.expectedUsers)}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  Tokens per member
                </span>
                <input
                  type="number"
                  min={1}
                  value={tokens}
                  onChange={(event) => setTokens(event.target.value)}
                  placeholder="10000000"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  Enterprise start date
                </span>
                <input
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  placeholder="2026-11-01"
                  maxLength={120}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  Notes (sent to the requester)
                </span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Welcome aboard…"
                  maxLength={2000}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={
                    approveMutation.isPending ||
                    seats === "" ||
                    tokens === "" ||
                    startDate.trim() === ""
                  }
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {approveMutation.isPending
                    ? "Approving…"
                    : "Approve & activate Enterprise"}
                </button>
              </div>
            </form>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Support conversation">
          <EnterpriseThread
            ticketId={request.supportTicketId}
            onReplied={() =>
              void queryClient.invalidateQueries({
                queryKey: enterpriseKeys.all,
              })
            }
          />
        </Section>
      </div>
    </main>
  );
}