"use client";

import type { TLawyerUpdate, TLawyerWithImage } from "@vidhan/schema";
import { LawyerRow } from "./LawyerRow";

export type TLawyerTableProps = {
  lawyers: TLawyerWithImage[];
  updatingId: string | undefined;
  onToggle: (id: string, patch: TLawyerUpdate) => void;
  onEdit: (lawyer: TLawyerWithImage) => void;
};

const HEADERS = [
  "Name",
  "District",
  "Practice areas",
  "Languages",
  "Experience",
  "Bar number",
  "Verified",
  "Active",
  "Updated",
  "Actions",
];

export function LawyerTable({
  lawyers,
  updatingId,
  onToggle,
  onEdit,
}: TLawyerTableProps) {
  if (lawyers.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No lawyers match these filters.
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
          {lawyers.map((lawyer) => (
            <LawyerRow
              key={lawyer.id}
              lawyer={lawyer}
              busy={updatingId === lawyer.id}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
