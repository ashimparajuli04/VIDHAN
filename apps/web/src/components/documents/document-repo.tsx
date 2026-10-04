"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import {
  GroupedVirtuoso,
  type GroupedVirtuosoHandle,
  type ListItem,
} from "react-virtuoso";

import { AlphabetIndex } from "@/components/documents/alphabet-index";
import { DocumentRow } from "@/components/documents/document-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  groupByInitial,
  searchDocuments,
} from "@/features/documents/groups";
import { getRepositoryDocuments } from "@/lib/documents";
import type { TRepoDocument } from "@/lib/documents";

const SKELETON_ROWS = 10;

export function DocumentRepo() {
  const [documents, setDocuments] = React.useState<TRepoDocument[] | null>(
    null,
  );
  const [error, setError] = React.useState(false);
  const [retryKey, setRetryKey] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [activeLetter, setActiveLetter] = React.useState<string | null>(null);
  const virtuosoRef = React.useRef<GroupedVirtuosoHandle>(null);

  React.useEffect(() => {
    let active = true;
    setError(false);

    getRepositoryDocuments()
      .then((result) => {
        if (!active) return;
        setDocuments(result);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  const sections = React.useMemo(
    () => groupByInitial(documents ?? []),
    [documents],
  );
  const letters = sections.map((section) => section.letter);
  // GroupedVirtuoso consumes the list as one flattened stream. itemContent's
  // index is flat across all groups (despite what the docs example implies),
  // so rows are looked up from the flat array; groupCounts only drive the
  // group boundaries.
  const { groupCounts, flatItems, firstRowOfGroup } = React.useMemo(() => {
    const counts = sections.map((section) => section.documents.length);
    const items = sections.flatMap((section) => section.documents);
    const firstRows = new Set<number>();
    let offset = 0;
    for (const count of counts) {
      firstRows.add(offset);
      offset += count;
    }
    return { groupCounts: counts, flatItems: items, firstRowOfGroup: firstRows };
  }, [sections]);

  // Search filters the full set locally — 200 titles, no round trip needed.
  const results = React.useMemo(() => {
    if (!query.trim() || !documents) return null;
    return searchDocuments(documents, query);
  }, [documents, query]);

  // The virtualizer only mounts the rows around the viewport and unmounts
  // the rest as they scroll away; the group header of the topmost visible
  // row is what the alphabet index should highlight.
  function handleItemsRendered(items: ListItem<unknown>[]) {
    let letter: string | null = null;
    for (const item of items) {
      if (item.type !== "group" && item.groupIndex != null) {
        letter = sections[item.groupIndex]?.letter ?? null;
        break;
      }
    }
    setActiveLetter((prev) => (prev === letter ? prev : letter));
  }

  function scrollToLetter(letter: string) {
    setActiveLetter(letter);
    const groupIndex = sections.findIndex(
      (section) => section.letter === letter,
    );
    if (groupIndex < 0) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    virtuosoRef.current?.scrollToIndex({
      groupIndex,
      align: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Search ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveLetter(null);
          }}
          placeholder="Search documents…"
          aria-label="Search documents"
          className="h-12 rounded-lg pl-11 pr-12 text-[15px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-[15px] font-medium">Couldn&apos;t load the repository</p>
          <p className="text-[15px] text-muted-foreground">
            Check that the API is running, then try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setRetryKey((prev) => prev + 1)}
          >
            Retry
          </Button>
        </div>
      ) : !documents ? (
        <RepositorySkeleton />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-[15px] font-medium">The repository is empty.</p>
          <p className="text-[15px] text-muted-foreground">
            Documents will appear here once they are added.
          </p>
        </div>
      ) : results ? (
        <ResultsView results={results} />
      ) : (
        <>
          <AlphabetIndex
            letters={letters}
            activeLetter={activeLetter}
            onSelect={scrollToLetter}
          />

          <p className="text-[15px] text-muted-foreground">
            {documents.length} documents
          </p>

          <GroupedVirtuoso
            ref={virtuosoRef}
            useWindowScroll
            overscan={400}
            groupCounts={groupCounts}
            groupContent={(groupIndex) => (
              <LetterHeader letter={sections[groupIndex]?.letter ?? ""} />
            )}
            itemContent={(index) => {
              // index is flat; it is always in range, the guard is only for
              // strict indexed access.
              const document = flatItems[index];
              if (!document) return null;
              return (
                <DocumentRow
                  document={document}
                  showDivider={!firstRowOfGroup.has(index)}
                />
              );
            }}
            itemsRendered={handleItemsRendered}
          />
        </>
      )}
    </div>
  );
}

// Rendered inside the virtualizer's sticky header slot, which pins to the
// top of the viewport while the group is in view — opaque background keeps
// the rows scrolling underneath from showing through. Spacing is padding,
// not margin: item sizes come from a contentRect ResizeObserver, which
// ignores margins.
function LetterHeader({ letter }: { letter: string }) {
  return (
    <div className="flex items-baseline gap-3 bg-background px-1 pt-7 pb-2.5">
      <h2 className="text-xl font-semibold tracking-tight">{letter}</h2>
      <div
        aria-hidden
        className="h-px flex-1 -translate-y-[3px] bg-border"
      />
    </div>
  );
}

function ResultsView({ results }: { results: TRepoDocument[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-medium text-muted-foreground">
        Search results · {results.length}{" "}
        {results.length === 1 ? "document" : "documents"}
      </h2>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-[15px] font-medium">No documents found.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/70 rounded-lg border bg-card">
          {results.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RepositorySkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading documents">
      <div>
        <Skeleton className="mb-3 h-7 w-24" />
        <div className="divide-y divide-border/70 overflow-hidden rounded-lg border bg-card">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} className="flex min-h-14 items-center gap-3 px-4 sm:px-5">
              <Skeleton
                className={`h-[18px] ${index % 3 === 0 ? "w-3/4" : "w-1/2"}`}
              />
              <Skeleton className="ml-auto h-[18px] w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}