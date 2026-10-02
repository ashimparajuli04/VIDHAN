"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";

import type { TPublicLawyer } from "@vidhan/schema";
import { DISTRICTS, LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";

import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { LawyerSkeleton } from "@/components/lawyers/lawyer-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { districtLabel, languageLabel, practiceAreaLabel } from "@/features/lawyers/labels";
import { getLawyers, type LawyerQuery } from "@/lib/lawyers";

const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_COUNT = 8;

export function LawyerCatalogue() {
  const [lawyers, setLawyers] = React.useState<TPublicLawyer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState<LawyerQuery>({});

  const hasActiveFilters = Boolean(
    query.search || query.practiceArea || query.district || query.language
  );

  // Debounce the search box into the query.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setQuery((prev) => ({
        ...prev,
        search: searchInput.trim() || undefined,
      }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Fetch whenever the query changes. When a real API exists, this is the
  // only place that changes shape — getLawyers does the rest.
  React.useEffect(() => {
    let active = true;
    setLoading(true);

    getLawyers(query).then((results) => {
      if (!active) return;
      setLawyers(results);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [query]);

  function resetFilters() {
    setSearchInput("");
    setQuery({});
  }

  return (
    <div className="space-y-8">
      {/* ── Filters: compact and secondary to the cards ── */}
      <div
        className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center"
        role="search"
        aria-label="Filter lawyers"
      >
        <div className="relative md:w-64 md:flex-1 md:min-w-48">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search lawyers…"
            aria-label="Search lawyers"
            className="pl-9"
          />
        </div>

        <FilterSelect
          value={query.practiceArea ?? ""}
          onChange={(value) =>
            setQuery((prev) => ({ ...prev, practiceArea: value || undefined }))
          }
          placeholder="Practice area"
          ariaLabel="Filter by practice area"
          options={PRACTICE_AREAS.map((area) => ({
            value: area,
            label: practiceAreaLabel(area),
          }))}
        />

        <FilterSelect
          value={query.district ?? ""}
          onChange={(value) =>
            setQuery((prev) => ({ ...prev, district: value || undefined }))
          }
          placeholder="District"
          ariaLabel="Filter by district"
          options={DISTRICTS.map((district) => ({
            value: district,
            label: districtLabel(district),
          }))}
        />

        <FilterSelect
          value={query.language ?? ""}
          onChange={(value) =>
            setQuery((prev) => ({ ...prev, language: value || undefined }))
          }
          placeholder="Language"
          ariaLabel="Filter by language"
          options={LANGUAGES.map((language) => ({
            value: language,
            label: languageLabel(language),
          }))}
        />

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 shrink-0 text-muted-foreground"
          >
            <X />
            Clear
          </Button>
        )}
      </div>

      {/* ── Results ── */}
      <div aria-busy={loading}>
        {loading ? (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-label="Loading lawyers"
          >
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <LawyerSkeleton key={index} />
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-20 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No lawyers match your filters</p>
            <p className="text-sm text-muted-foreground">
              Try broadening your search or clearing a filter.
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  ariaLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative md:w-44 md:shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-8 w-full min-w-0 appearance-none rounded-md border border-input bg-background pr-8 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-background [&>option]:text-foreground"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}