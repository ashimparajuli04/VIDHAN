"use client";

import { DISTRICTS, PRACTICE_AREAS } from "@vidhan/schema";
import type { TDistrict, TPracticeArea } from "@vidhan/schema";
import { districtLabel, practiceAreaLabel } from "../labels";

export type TFiltersProps = {
  search: string;
  onSearch: (value: string) => void;
  practiceArea: TPracticeArea | "";
  onPracticeArea: (value: TPracticeArea | "") => void;
  district: TDistrict | "";
  onDistrict: (value: TDistrict | "") => void;
  active: boolean | undefined;
  onActive: (value: boolean | undefined) => void;
};

const selectClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none";

export function Filters({
  search,
  onSearch,
  practiceArea,
  onPracticeArea,
  district,
  onDistrict,
  active,
  onActive,
}: TFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search name or bar number"
        className={`${selectClass} w-64`}
      />
      <select
        value={practiceArea}
        onChange={(event) =>
          onPracticeArea(event.target.value as TPracticeArea | "")
        }
        className={selectClass}
      >
        <option value="">All practice areas</option>
        {PRACTICE_AREAS.map((area) => (
          <option key={area} value={area}>
            {practiceAreaLabel(area)}
          </option>
        ))}
      </select>
      <select
        value={district}
        onChange={(event) => onDistrict(event.target.value as TDistrict | "")}
        className={selectClass}
      >
        <option value="">All districts</option>
        {DISTRICTS.map((item) => (
          <option key={item} value={item}>
            {districtLabel(item)}
          </option>
        ))}
      </select>
      <select
        value={active === undefined ? "all" : String(active)}
        onChange={(event) => {
          const value = event.target.value;
          onActive(value === "all" ? undefined : value === "true");
        }}
        className={selectClass}
      >
        <option value="all">All statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>
  );
}
