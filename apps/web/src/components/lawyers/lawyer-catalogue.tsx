"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Virtuoso } from "react-virtuoso";

import type { TPublicLawyer } from "@vidhan/schema";
import { DISTRICTS, LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";

import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { LawyerSkeleton } from "@/components/lawyers/lawyer-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chunkIntoRows, useGridColumns } from "@/features/lawyers/grid";
import { districtLabel, languageLabel, practiceAreaLabel } from "@/features/lawyers/labels";
import { getLawyers, type LawyerQuery } from "@/lib/lawyers";

const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_COUNT = 8;

export function LawyerCatalogue() {
  const [lawyers, setLawyers] = React.useState<TPublicLawyer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState<LawyerQuery>({});

  const columns = useGridColumns();
  // Cards virtualize as rows of `columns`; the virtualizer measures each
  // row as one item, so breakpoint changes re-chunk the list live.
  const rows = React.useMemo(
    () => chunkIntoRows(lawyers, columns),
    [lawyers, columns],
  );

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
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search lawyers…"
            aria-label="Search lawyers"
            className="h-12 pl-11"
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
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border bg-gradient-to-b from-peach-top to-peach-bottom px-6 py-20 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-background/60">
              <Search className="size-6 text-muted-foreground" />
            </span>
            <p className="text-base font-semibold">No lawyers match your filters</p>
            <p className="max-w-sm text-[15px] text-muted-foreground">
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
          <Virtuoso
            useWindowScroll
            overscan={400}
            totalCount={rows.length}
            computeItemKey={(index) => rows[index]?.[0]?.id ?? index}
            itemContent={(index) => {
              // index is always in range; the guard is only for strict
              // indexed access.
              const row = rows[index];
              if (!row) return null;
              return (
                <div
                  // Inline grid-template (not breakpoint classes) so the
                  // columns always match the chunk size; pb-5 keeps the
                  // inter-row gap, since margins are invisible to
                  // Virtuoso's contentRect measurement.
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                  className="grid gap-5 pb-5"
                >
                  {row.map((lawyer) => (
                    <LawyerCard key={lawyer.id} lawyer={lawyer} />
                  ))}
                </div>
              );
            }}
          />
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
    <div className="relative md:w-48 md:shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-11 w-full min-w-0 appearance-none rounded-full border border-border bg-white pr-10 pl-4 text-[15px] transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 dark:bg-white/[0.06] [&>option]:bg-background [&>option]:text-foreground"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}