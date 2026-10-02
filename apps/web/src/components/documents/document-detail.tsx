"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Virtuoso,
  type ListItem,
  type VirtuosoHandle,
} from "react-virtuoso";
import remarkGfm from "remark-gfm";

import type { TDocumentTocHeading } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getDocument, getDocumentChunks, getDocumentToc } from "@/lib/documents";
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
 * document never renders — or ships — all at once. The ingest-time TOC
 * (headings → chunk index) powers the jump list: clicking a heading scrolls
 * Virtuoso to its chunk, which then prefetches on demand like any scroll.
 */
export function DocumentDetail({ id }: { id: string }) {
  const [document, setDocument] = React.useState<TRepoDocument | null>(null);
  const [chunks, setChunks] = React.useState<ReadonlyMap<number, string>>(
    new Map(),
  );
  const [totalChunks, setTotalChunks] = React.useState<number | null>(null);
  const [toc, setToc] = React.useState<TDocumentTocHeading[] | null>(null);
  const [activeHeading, setActiveHeading] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<
    "loading" | "ready" | "error" | "not-found"
  >("loading");
  const [retryKey, setRetryKey] = React.useState(0);
  // Which TOC tree nodes are expanded, keyed by flat heading position.
  const [expanded, setExpanded] = React.useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const virtuosoRef = React.useRef<VirtuosoHandle>(null);

  // Refs survive render boundaries; the virtualizer's callbacks only ever
  // read the latest frontier/headings through them.
  const totalChunksRef = React.useRef(0);
  const nextIndexRef = React.useRef(0); // next chunk index to fetch; == total when done
  const fetchingRef = React.useRef(false);
  const requestedRef = React.useRef(-1); // last `after` sent; avoids duplicate fetches
  const tocRef = React.useRef<TDocumentTocHeading[]>([]);

  React.useEffect(() => {
    totalChunksRef.current = totalChunks ?? 0;
  }, [totalChunks]);

  React.useEffect(() => {
    tocRef.current = toc ?? [];
  }, [toc]);

  // The tree derived once per TOC fetch; expanded state keys off the flat
  // positions, so expand/collapse survives re-renders. Everything starts
  // collapsed; the user opens branches with the chevrons.
  const tocTree = React.useMemo(() => buildTocTree(toc ?? []), [toc]);

  function toggleHeading(position: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  }

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    setChunks(new Map());
    setToc(null);
    setActiveHeading(null);

    Promise.all([
      getDocument(id),
      getDocumentChunks(id, { limit: PAGE_SIZE }),
      getDocumentToc(id),
    ])
      .then(([meta, page, tocResult]) => {
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
        setToc(tocResult.headings);
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

  // Mirrors the repo list's alphabet index: the active heading is the last
  // one whose chunk is at or above the topmost rendered item.
  function handleItemsRendered(items: ListItem<unknown>[]) {
    for (const item of items) {
      if (item.type !== "group" && typeof item.index === "number") {
        const headings = tocRef.current;
        let active: number | null = null;
        for (let i = 0; i < headings.length; i++) {
          if (headings[i]!.chunkIndex <= item.index) active = i;
          else break;
        }
        setActiveHeading((prev) => (prev === active ? prev : active));
        break;
      }
    }
  }

  function scrollToHeading(position: number) {
    const heading = toc?.[position];
    if (!heading) return;
    setActiveHeading(position);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    virtuosoRef.current?.scrollToIndex({
      index: heading.chunkIndex,
      align: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }

  const hasToc = toc !== null && toc.length > 0;

  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 pb-16 md:px-8 md:pb-24",
        hasToc && totalChunks !== null && totalChunks > 0
          ? "max-w-6xl"
          : "max-w-3xl",
      )}
    >
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
            <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
              {hasToc && (
                <TocSidebar
                  tree={tocTree}
                  activeIndex={activeHeading}
                  expanded={expanded}
                  onSelect={scrollToHeading}
                  onToggle={toggleHeading}
                />
              )}

              <div className="min-w-0">
                {hasToc && (
                  <TocMobile
                    tree={tocTree}
                    activeIndex={activeHeading}
                    expanded={expanded}
                    onSelect={scrollToHeading}
                    onToggle={toggleHeading}
                  />
                )}

                <Virtuoso
                  ref={virtuosoRef}
                  useWindowScroll
                  overscan={1600}
                  totalCount={totalChunks}
                  defaultItemHeight={1000}
                  rangeChanged={handleRangeChanged}
                  itemsRendered={handleItemsRendered}
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
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function TocSidebar({
  tree,
  activeIndex,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeIndex: number | null;
  expanded: ReadonlySet<number>;
  onSelect: (position: number) => void;
  onToggle: (position: number) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Contents
        </h2>
        <TocTree
          tree={tree}
          activeIndex={activeIndex}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      </div>
    </aside>
  );
}

// Mobile: collapsible panel above the content.
function TocMobile({
  tree,
  activeIndex,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeIndex: number | null;
  expanded: ReadonlySet<number>;
  onSelect: (position: number) => void;
  onToggle: (position: number) => void;
}) {
  return (
    <details className="group mb-6 lg:hidden">
      <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm font-medium text-muted-foreground select-none">
        Contents
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border bg-card p-2">
        <TocTree
          tree={tree}
          activeIndex={activeIndex}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      </div>
    </details>
  );
}

interface TocNode extends TDocumentTocHeading {
  /** Flat index in the original heading list — the key for expand state and scroll targets. */
  position: number;
  children: TocNode[];
}

// Turn the flat ingest-time heading list into an outline tree: a heading's
// parent is the most recent preceding heading with a LOWER level, so
// Part I → Articles → Clauses. (The standalone "Preamble" level-2 heading
// at the top simply becomes a childless root.)
function buildTocTree(headings: TDocumentTocHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  headings.forEach((heading, position) => {
    const node: TocNode = { ...heading, position, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.level >= heading.level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  });
  return roots;
}

function TocTree({
  tree,
  activeIndex,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeIndex: number | null;
  expanded: ReadonlySet<number>;
  onSelect: (position: number) => void;
  onToggle: (position: number) => void;
}) {
  if (tree.length === 0) return null;
  return (
    <nav aria-label="Contents" className="space-y-0.5">
      {tree.map((node) => (
        <TocTreeNode
          key={node.position}
          node={node}
          activeIndex={activeIndex}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </nav>
  );
}

// One outline entry. A node WITH children shows the expand chevron (down
// when collapsed, pointing up when open); a leaf gets a spacer so the
// labels stay aligned. The label itself still jumps to the heading.
function TocTreeNode({
  node,
  activeIndex,
  expanded,
  onSelect,
  onToggle,
}: {
  node: TocNode;
  activeIndex: number | null;
  expanded: ReadonlySet<number>;
  onSelect: (position: number) => void;
  onToggle: (position: number) => void;
}) {
  const isExpanded = expanded.has(node.position);
  const hasChildren = node.children.length > 0;
  const isActive = node.position === activeIndex;
  const isLevel1 = node.level === 1;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.position)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.text}`}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </button>
        ) : (
          <span aria-hidden className="size-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.position)}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            "min-w-0 flex-1 truncate rounded-md py-1 pr-2 text-left text-[13px] leading-snug transition-colors",
            isActive
              ? isLevel1
                ? "bg-accent font-semibold text-foreground"
                : "bg-accent font-medium text-foreground"
              : cn(
                  "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  isLevel1 && "font-semibold",
                ),
          )}
        >
          {node.text}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul className="ml-2 space-y-0.5 border-l border-border/60 pl-1.5">
          {node.children.map((child) => (
            <TocTreeNode
              key={child.position}
              node={child}
              activeIndex={activeIndex}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
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