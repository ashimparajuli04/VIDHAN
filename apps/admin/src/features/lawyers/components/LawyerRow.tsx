"use client";

import type { TLawyerUpdate, TLawyerWithImage } from "@vidhan/schema";
import { Toggle } from "@/components/Toggle";
import { Avatar } from "./Avatar";
import {
  districtLabel,
  formatDate,
  languageLabel,
  practiceAreaLabel,
  seniorityLabel,
} from "../labels";

export type TLawyerRowProps = {
  lawyer: TLawyerWithImage;
  busy: boolean;
  onToggle: (id: string, patch: TLawyerUpdate) => void;
  onEdit: (lawyer: TLawyerWithImage) => void;
};

export function LawyerRow({
  lawyer,
  busy,
  onToggle,
  onEdit,
}: TLawyerRowProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar
            name={lawyer.name}
            imageUrl={lawyer.imageUrl}
            className="h-8 w-8 text-sm"
          />
          <span className="font-medium text-slate-900">{lawyer.name}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-slate-700">
        {districtLabel(lawyer.district)}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {seniorityLabel(lawyer.seniority)}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {lawyer.practiceAreas.map(practiceAreaLabel).join(", ")}
      </td>
      <td className="px-3 py-2 text-slate-700">
        {lawyer.languages.map(languageLabel).join(", ")}
      </td>
      <td className="px-3 py-2 text-right text-slate-700">
        {lawyer.yearsOfExperience ?? "—"}
      </td>
      <td className="px-3 py-2 text-slate-500">{lawyer.barNumber ?? "—"}</td>
      <td className="px-3 py-2">
        <Toggle
          checked={lawyer.verified}
          disabled={busy}
          label={`Verified for ${lawyer.name}`}
          onChange={(next) => onToggle(lawyer.id, { verified: next })}
        />
      </td>
      <td className="px-3 py-2">
        <Toggle
          checked={lawyer.active}
          disabled={busy}
          label={`Active for ${lawyer.name}`}
          onChange={(next) => onToggle(lawyer.id, { active: next })}
        />
      </td>
      <td className="px-3 py-2 text-slate-500">
        {formatDate(lawyer.updatedAt)}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onEdit(lawyer)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}
