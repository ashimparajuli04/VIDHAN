"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Virtuoso } from "react-virtuoso";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument, getDocumentChunks } from "@/lib/documents";
import type { TRepoDocument } from "@/lib/documents";

// One network page, and how far past the loaded frontier the visible range
// may reach before the next page is prefetched. Chunks are ~2000 chars, so
// 10 per page keeps the reader eager without bursting.
const PAGE_SIZE = 10;
const PREFETCH_GAP = 3;
const SKELETON_ROWS = 4;

/**
 * Document reader. Content is fetched one page of chunks at a time and held
 * in a cache; Virtuoso mounts only the rows around the viewport, so a long
 * document never renders — or ships — all at once.
 */
export function DocumentDetail({ id }: { id: string }) {
  const [document, setDocument] = React.useState<TRepoDocument | null>(null);
  const [chunks, setChunks] = React.useState<ReadonlyMap<number, string>>(
    new Map(),
  );
  const [totalChunks, setTotalChunks] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<
    "loading" | "ready" | "error" | "not-found"
  >("loading");
  const [retryKey, setRetryKey] = React.useState(0);

  // Refs survive render boundaries; the virtualizer's callbacks only ever
  // read the latest frontier through them.
  const totalChunksRef = React.useRef(0);
  const nextIndexRef = React.useRef(0); // next chunk index to fetch; == total when done
  const fetchingRef = React.useRef(false);
  const requestedRef = React.useRef(-1); // last `after` sent; avoids duplicate fetches

  React.useEffect(() => {
    totalChunksRef.current = totalChunks ?? 0;
  }, [totalChunks]);

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    setChunks(new Map());

    Promise.all([getDocument(id), getDocumentChunks(id, { limit: PAGE_SIZE })])
      .then(([meta, page]) => {
        if (!active) return;
        if (!meta) {
          setStatus("not-found");
          return;
        }
        setDocument(meta);
        setChunks((prev) => {
          const next = new Map(prev);
          for (const chunk of page.chunks) next.set(chunk.index, chunk.content);
          return next;
        });
        setTotalChunks(page.totalChunks);
        nextIndexRef.current = page.nextIndex ?? page.totalChunks;
        totalChunksRef.current = page.totalChunks;
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [id, retryKey]);

  async function fetchMore() {
    if (fetchingRef.current) return;
    if (nextIndexRef.current >= totalChunksRef.current) return;
    const after = nextIndexRef.current - 1;
    if (after === requestedRef.current) return;
    requestedRef.current = after;
    fetchingRef.current = true;
    try {
      const page = await getDocumentChunks(id, { limit: PAGE_SIZE, after });
      setChunks((prev) => {
        const next = new Map(prev);
        for (const chunk of page.chunks) next.set(chunk.index, chunk.content);
        return next;
      });
      nextIndexRef.current = page.nextIndex ?? page.totalChunks;
    } catch {
      // Transient network failure: allow the next scroll pass to retry.
      requestedRef.current = -1;
    } finally {
      fetchingRef.current = false;
    }
  }

  function handleRangeChanged(range: { startIndex: number; endIndex: number }) {
    if (range.endIndex + PREFETCH_GAP >= nextIndexRef.current) {
      void fetchMore();
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-16 md:p-8 md:pb-24">
      <nav aria-label="Breadcrumb">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mx-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link href="/repo">
            <ChevronLeft className="size-4" />
            All documents
          </Link>
        </Button>
      </nav>

      {status === "loading" && <ReaderSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load this document</p>
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
      )}

      {status === "not-found" && (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Document not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This document is unavailable or no longer exists.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/repo">Back to the repository</Link>
          </Button>
        </div>
      )}

      {status === "ready" && document && totalChunks !== null && (
        <>
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {document.title}
            </h1>
            {typeof document.year === "number" && (
              <p className="mt-2 text-[15px] text-muted-foreground">
                {document.year}
              </p>
            )}
          </header>

          {totalChunks === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm font-medium">
                No content available for this document yet
              </p>
              <p className="text-sm text-muted-foreground">
                The full text will appear here once it is published.
              </p>
            </div>
          ) : (
            <Virtuoso
              useWindowScroll
              overscan={1600}
              totalCount={totalChunks}
              defaultItemHeight={1000}
              rangeChanged={handleRangeChanged}
              itemContent={(index) => {
                const content = chunks.get(index);
                return content === undefined ? (
                  <ChunkSkeleton />
                ) : (
                  <div className="py-0.5">
                    <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-5 prose-headings:mb-2 prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base prose-h4:text-base prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-3 prose-hr:my-5 prose-table:my-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

function ReaderSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading document">
      <Skeleton className="mb-3 h-9 w-2/3" />
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton
            key={index}
            className={`h-4 ${index % 3 === 1 ? "w-4/5" : "w-full"}`}
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton
            key={index}
            className={`h-4 ${index % 3 === 0 ? "w-3/4" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

// Shown while the next page is in flight; keeps the scrollbar position stable.
function ChunkSkeleton() {
  return (
    <div className="space-y-3 py-3" aria-hidden>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index % 5 === 2 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}