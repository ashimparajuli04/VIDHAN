"use client";

import { ApiError } from "@/lib/api";
import { useEnterpriseOrganization } from "../hooks";
import {
  formatDate,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  ORG_STATUS_LABELS,
} from "../labels";

const HEADERS = ["Member", "Email", "Role", "Status", "Tokens", "Added"];

export function OrganizationDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const query = useEnterpriseOrganization(id);

  if (query.isLoading) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-slate-500">
        Loading…
      </p>
    );
  }
  if (query.error && !(query.error instanceof ApiError && query.error.unauthorized)) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-red-600">
        Failed to load organization.
      </p>
    );
  }

  const organization = query.data;
  if (!organization) return null;

  const activeMembers = organization.members.filter(
    (member) => member.status === "active" || member.status === "invited",
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-slate-500 hover:text-slate-900"
      >
        ← All organizations
      </button>

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Enterprise Plan · {ORG_STATUS_LABELS[organization.status]} · created{" "}
          {formatDate(organization.createdAt)}
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Approved members
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {activeMembers} / {organization.approvedSeats}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Token allocation / member
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {organization.tokensPerMember.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Start date
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {organization.startDate ?? "—"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {organization.members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-3 py-2 font-medium text-slate-900">
                  {member.userName ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-700">{member.email}</td>
                <td className="px-3 py-2 text-slate-700">
                  {MEMBER_ROLE_LABELS[member.role]}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : member.status === "invited"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {MEMBER_STATUS_LABELS[member.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {member.tokensAllocated === null
                    ? `${organization.tokensPerMember.toLocaleString("en-US")} (default)`
                    : member.tokensAllocated.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {formatDate(member.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}