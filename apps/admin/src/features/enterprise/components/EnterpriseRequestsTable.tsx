"use client";

import type { TAdminEnterpriseRequest } from "@vidhan/schema";
import {
  formatDate,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_PILLS,
} from "../labels";

const HEADERS = [
  "Organization",
  "Requester",
  "Status",
  "Expected users",
  "Updated",
  "Actions",
];

export function EnterpriseRequestsTable({
  requests,
  onOpen,
}: {
  requests: TAdminEnterpriseRequest[];
  onOpen: (id: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No Enterprise requests match this filter.
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
                {request.organizationName}
              </td>
              <td className="px-3 py-2 text-slate-700">
                <span className="block">{request.userName}</span>
                <span className="block text-xs text-slate-500">
                  {request.userEmail}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_PILLS[request.status]}`}
                >
                  {REQUEST_STATUS_LABELS[request.status]}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-700">
                {request.expectedUsers}
              </td>
              <td className="px-3 py-2 text-slate-500">
                {formatDate(request.updatedAt)}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpen(request.id)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}