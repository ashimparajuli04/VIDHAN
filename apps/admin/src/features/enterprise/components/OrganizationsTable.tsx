"use client";

import type { TAdminEnterpriseOrganization } from "@vidhan/schema";
import { formatDate, ORG_STATUS_LABELS } from "../labels";

const HEADERS = [
  "Organization",
  "Status",
  "Seats used",
  "Tokens / member",
  "Start date",
  "Actions",
];

export function OrganizationsTable({
  organizations,
  onOpen,
}: {
  organizations: TAdminEnterpriseOrganization[];
  onOpen: (id: string) => void;
}) {
  if (organizations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No Enterprise organizations yet. Approved requests appear here.
      </p>
    );
  }

  return (
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
          {organizations.map((organization) => (
            <tr
              key={organization.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {organization.name}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    organization.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {ORG_STATUS_LABELS[organization.status]}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-700">
                {organization.memberCount} / {organization.approvedSeats}
              </td>
              <td className="px-3 py-2 text-slate-700">
                {organization.tokensPerMember.toLocaleString("en-US")}
              </td>
              <td className="px-3 py-2 text-slate-500">
                {organization.startDate ?? "—"}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpen(organization.id)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}