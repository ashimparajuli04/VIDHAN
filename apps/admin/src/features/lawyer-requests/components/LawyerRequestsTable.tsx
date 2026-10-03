"use client";

import { LAWYER_REQUEST_STATUSES } from "@vidhan/schema";
import type { TAdminLawyerRequest, TRequestStatus } from "@vidhan/schema";
import { formatDate } from "@/features/lawyers/labels";
import { consultationModeLabel, requestStatusLabel } from "../labels";

export type TLawyerRequestsTableProps = {
  requests: TAdminLawyerRequest[];
  updatingId: string | undefined;
  onStatusChange: (id: string, status: TRequestStatus) => void;
};

const HEADERS = [
  "Lawyer",
  "User",
  "Phone",
  "Preferred time",
  "Mode",
  "Note",
  "Status",
  "Updated",
];

export function LawyerRequestsTable({
  requests,
  updatingId,
  onStatusChange,
}: TLawyerRequestsTableProps) {
  if (requests.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No callback requests yet.
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
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {request.lawyerName}
              </td>
              <td className="px-3 py-2 text-slate-700">
                <span className="block">{request.userName}</span>
                <span className="block text-xs text-slate-500">
                  {request.userEmail}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-700">{request.phone}</td>
              <td className="px-3 py-2 text-slate-700">
                {request.preferredTime}
              </td>
              <td className="px-3 py-2 text-slate-700">
                {request.mode ? consultationModeLabel(request.mode) : "—"}
              </td>
              <td className="max-w-xs px-3 py-2 text-slate-500">
                {request.note ?? "—"}
              </td>
              <td className="px-3 py-2">
                <select
                  value={request.status}
                  disabled={updatingId === request.id}
                  aria-label={`Status for ${request.lawyerName}`}
                  onChange={(event) =>
                    onStatusChange(
                      request.id,
                      event.target.value as TRequestStatus,
                    )
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 disabled:opacity-50"
                >
                  {LAWYER_REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {requestStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 text-slate-500">
                {formatDate(request.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
