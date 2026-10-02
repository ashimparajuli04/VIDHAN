"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

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
  const sectionElements = React.useRef(new Map<string, HTMLElement>());

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

  // Search filters the full set locally — 200 titles, no round trip needed.
  const results = React.useMemo(() => {
    if (!query.trim() || !documents) return null;
    return searchDocuments(documents, query);
  }, [documents, query]);

  const browsing = !query.trim();

  // Track the section currently near the top so the index can highlight it.
  React.useEffect(() => {
    if (!browsing || !documents) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveLetter(entry.target.id.slice("section-".length));
          }
        }
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    for (const element of sectionElements.current.values()) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [browsing, documents]);

  function scrollToLetter(letter: string) {
    setActiveLetter(letter);
    const element = sectionElements.current.get(letter);
    if (!element) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Search ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveLetter(null);
          }}
          placeholder="Search documents…"
          aria-label="Search documents"
          className="h-11 rounded-lg pl-9 pr-10 text-[15px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load the repository</p>
          <p className="text-sm text-muted-foreground">
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
          <p className="text-sm font-medium">The repository is empty.</p>
          <p className="text-sm text-muted-foreground">
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

          <p className="text-sm text-muted-foreground">
            {documents.length} documents
          </p>

          <div className="space-y-8">
            {sections.map((section) => (
              <section
                key={section.letter}
                id={`section-${section.letter}`}
                ref={(element) => {
                  if (element) sectionElements.current.set(section.letter, element);
                  else sectionElements.current.delete(section.letter);
                }}
                className="scroll-mt-6"
              >
                <div className="mb-2 flex items-baseline gap-3 px-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {section.letter}
                  </h2>
                  <div
                    aria-hidden
                    className="h-px flex-1 translate-y-[-3px] bg-border"
                  />
                </div>
                <ul className="divide-y divide-border/70 rounded-lg border bg-card">
                  {section.documents.map((document) => (
                    <DocumentRow key={document.id} document={document} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResultsView({ results }: { results: TRepoDocument[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Search results · {results.length}{" "}
        {results.length === 1 ? "document" : "documents"}
      </h2>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No documents found.</p>
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
            <div key={index} className="flex min-h-12 items-center gap-3 px-3 sm:px-4">
              <Skeleton
                className={`h-4 ${index % 3 === 0 ? "w-3/4" : "w-1/2"}`}
              />
              <Skeleton className="ml-auto h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}