"use client";

import type { TAdminSupportTicket } from "@vidhan/schema";
import { categoryLabel, formatDate, sourceLabel, statusLabel } from "../labels";

const HEADERS = [
  "Subject",
  "User",
  "Category",
  "Source",
  "Status",
  "Updated",
  "Actions",
];

export function SupportTable({
  tickets,
  onOpen,
}: {
  tickets: TAdminSupportTicket[];
  onOpen: (id: string) => void;
}) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No tickets match this filter.
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
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {ticket.subject}
              </td>
              <td className="px-3 py-2 text-slate-700">
                <span className="block">{ticket.user.name}</span>
                <span className="block text-xs text-slate-500">
                  {ticket.user.email}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-700">
                {categoryLabel(ticket.category)}
              </td>
              <td className="px-3 py-2 text-slate-700">
                {sourceLabel(ticket.source)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ticket.status === "open"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {statusLabel(ticket.status)}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500">
                {formatDate(ticket.updatedAt)}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpen(ticket.id)}
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
