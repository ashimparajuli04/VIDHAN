"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Virtuoso } from "react-virtuoso";

import type { TPublicLawyer } from "@vidhan/schema";
import { DISTRICTS, LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";

import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { LawyerSkeleton } from "@/components/lawyers/lawyer-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chunkIntoRows, useGridColumns } from "@/features/lawyers/grid";
import { districtLabel, languageLabel, practiceAreaLabel } from "@/features/lawyers/labels";
import { getLawyers, type LawyerQuery } from "@/lib/lawyers";

const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_COUNT = 8;

// Radix Select rejects empty-string values, so "no filter" is a sentinel
// that maps back to "" at the FilterSelect boundary.
const FILTER_NONE = "__none__";

export function LawyerCatalogue() {
  const [lawyers, setLawyers] = React.useState<TPublicLawyer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState<LawyerQuery>({});

  // The grid measures its own width, so `columns` stays in sync with the
  // container (including the sidebar's effect on available width).
  const { ref, columns } = useGridColumns();
  // Cards virtualize as rows of `columns`; the virtualizer measures each
  // row as one item, so breakpoint changes re-chunk the list live.
  const rows = React.useMemo(
    () => chunkIntoRows(lawyers, columns),
    [lawyers, columns],
  );

  const hasActiveFilters = Boolean(
    query.search || query.practiceArea || query.district || query.language
  );

  const activeFilterCount = [
    query.practiceArea,
    query.district,
    query.language,
  ].filter(Boolean).length;

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
    <div className="mx-auto w-full max-w-[1600px] space-y-8" ref={ref}>
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

        {/* Desktop: the three selects stay inline, side by side. */}
        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
          <FilterFields query={query} setQuery={setQuery} />
          {hasActiveFilters && <ClearFiltersButton onClick={resetFilters} />}
        </div>

        {/* Mobile: one full-width button opens the same filters in a popover. */}
        <div className="md:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label="Open filters"
                className="group h-12 w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </span>
                <ChevronDown className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none group-data-[state=open]:rotate-180" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-(--radix-popover-trigger-width) p-3"
            >
              <div className="flex flex-col gap-3">
                <FilterFields query={query} setQuery={setQuery} />
                {hasActiveFilters && (
                  <ClearFiltersButton onClick={resetFilters} />
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Results ── */}
      <div aria-busy={loading}>
        {loading ? (
          <div
            // Inline grid-template so the skeleton matches the measured
            // column count rather than viewport breakpoints.
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
            className="grid gap-5"
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
    // w-full inside the mobile popover; md:w-48 when inline on desktop.
    <div className="w-full md:w-48 md:shrink-0">
      <Select
        value={value || FILTER_NONE}
        onValueChange={(next) => onChange(next === FILTER_NONE ? "" : next)}
      >
        <SelectTrigger aria-label={ariaLabel} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" side="top">
          <SelectItem value={FILTER_NONE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// The three selects, shared by the desktop toolbar and the mobile popover.
function FilterFields({
  query,
  setQuery,
}: {
  query: LawyerQuery;
  setQuery: React.Dispatch<React.SetStateAction<LawyerQuery>>;
}) {
  return (
    <>
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
    </>
  );
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 shrink-0 text-muted-foreground"
    >
      <X />
      Clear
    </Button>
  );
}