"use client";

import type { TLawyer, TLawyerUpdate } from "@vidhan/schema";
import { Toggle } from "./Toggle";
import {
  districtLabel,
  formatDate,
  languageLabel,
  practiceAreaLabel,
} from "../labels";

export type TLawyerRowProps = {
  lawyer: TLawyer;
  busy: boolean;
  onToggle: (id: string, patch: TLawyerUpdate) => void;
};

export function LawyerRow({ lawyer, busy, onToggle }: TLawyerRowProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-3 py-2 font-medium text-slate-900">{lawyer.name}</td>
      <td className="px-3 py-2 text-slate-700">
        {districtLabel(lawyer.district)}
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
    </tr>
  );
}
