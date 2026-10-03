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

import type {
  TDocumentNode,
  TDocumentNodeOutline,
  TDocumentOutline,
  TPublicDocumentDetail,
} from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getDocument,
  getDocumentNode,
  getDocumentOutline,
} from "@/lib/documents";

// How far past the loaded frontier the visible range may reach before the next
// missing section is fetched.
const PREFETCH_GAP = 3;
const SKELETON_ROWS = 4;

/**
 * Document reader. The outline (node tree, no bodies) drives the TOC and the
 * virtualized list; each section's body is fetched lazily by node id and
 * cached. Virtuoso mounts only rows near the viewport, so long documents never
 * render or ship all at once.
 */
export function DocumentDetail({ id }: { id: string }) {
  const [document, setDocument] = React.useState<TPublicDocumentDetail | null>(
    null,
  );
  const [outline, setOutline] = React.useState<TDocumentOutline | null>(null);
  const [bodies, setBodies] = React.useState<ReadonlyMap<string, TDocumentNode>>(
    new Map(),
  );
  const [status, setStatus] = React.useState<
    "loading" | "ready" | "error" | "not-found"
  >("loading");
  const [retryKey, setRetryKey] = React.useState(0);
  const [activeRow, setActiveRow] = React.useState<number | null>(null);
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const fetchingRef = React.useRef<ReadonlySet<string>>(new Set());

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    setBodies(new Map());
    setOutline(null);
    setActiveRow(null);

    Promise.all([getDocument(id), getDocumentOutline(id)])
      .then(([meta, outlineResult]) => {
        if (!active) return;
        if (!meta) {
          setStatus("not-found");
          return;
        }
        setDocument(meta);
        setOutline(outlineResult);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [id, retryKey]);

  // Flatten the outline into the virtualizer's row model. Containers (chapter,
  // section_group) become heading rows; citeable nodes with content become
  // section rows. The flat index is the scroll target and cache key.
  const rows = React.useMemo(() => (outline ? flattenOutline(outline.nodes) : []), [outline]);
  const tocTree = React.useMemo(
    () => (outline ? buildTocTree(outline.nodes) : []),
    [outline],
  );

  const rowsRef = React.useRef(rows);
  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const fetchBody = React.useCallback(
    (node: TDocumentNodeOutline) => {
      if (bodies.has(node.id) || fetchingRef.current.has(node.id)) return;
      fetchingRef.current = new Set(fetchingRef.current).add(node.id);
      getDocumentNode(id, node.id)
        .then((full) => {
          if (!full) return;
          setBodies((prev) => {
            const next = new Map(prev);
            next.set(node.id, full);
            return next;
          });
        })
        .finally(() => {
          const next = new Set(fetchingRef.current);
          next.delete(node.id);
          fetchingRef.current = next;
        });
    },
    [bodies, id],
  );

  function handleRangeChanged(range: { startIndex: number; endIndex: number }) {
    const all = rowsRef.current;
    for (
      let i = range.startIndex;
      i <= Math.min(range.endIndex + PREFETCH_GAP, all.length - 1);
      i++
    ) {
      const row = all[i];
      if (row && row.isContent) void fetchBody(row);
    }
  }

  function handleItemsRendered(items: ListItem<unknown>[]) {
    for (const item of items) {
      if (item.type !== "group" && typeof item.index === "number") {
        setActiveRow((prev) => (prev === item.index ? prev : item.index));
        break;
      }
    }
  }

  function scrollToNode(nodeId: string) {
    const index = rows.findIndex((row) => row.id === nodeId);
    if (index < 0) return;
    setActiveRow(index);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }

  function toggleNode(nodeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  const hasToc = tocTree.length > 0;

  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 pb-16 md:px-8 md:pb-24",
        hasToc && rows.length > 0 ? "max-w-6xl" : "max-w-3xl",
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

      {status === "ready" && document && (
        <>
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {document.title}
            </h1>
            {typeof document.yearAd === "number" && (
              <p className="mt-2 text-[15px] text-muted-foreground">
                {document.yearAd}
                {typeof document.yearBs === "number" && ` (${document.yearBs} B.S.)`}
              </p>
            )}
          </header>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm font-medium">
                No content available for this document yet
              </p>
              <p className="text-sm text-muted-foreground">
                The full text will appear here once it is published.
              </p>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              {hasToc && (
                <TocSidebar
                  tree={tocTree}
                  activeId={activeRow !== null ? rows[activeRow]?.id ?? null : null}
                  expanded={expanded}
                  onSelect={scrollToNode}
                  onToggle={toggleNode}
                />
              )}

              <div className="min-w-0">
                {hasToc && (
                  <TocMobile
                    tree={tocTree}
                    activeId={activeRow !== null ? rows[activeRow]?.id ?? null : null}
                    expanded={expanded}
                    onSelect={scrollToNode}
                    onToggle={toggleNode}
                  />
                )}

                <Virtuoso
                  ref={virtuosoRef}
                  useWindowScroll
                  overscan={1200}
                  totalCount={rows.length}
                  defaultItemHeight={400}
                  rangeChanged={handleRangeChanged}
                  itemsRendered={handleItemsRendered}
                  itemContent={(index) => {
                    const row = rows[index];
                    if (!row) return null;
                    const body = bodies.get(row.id);
                    return (
                      <ReaderRow
                        row={row}
                        content={body?.content ?? null}
                        citation={body?.citation ?? row.citation}
                      />
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

interface FlatRow extends TDocumentNodeOutline {
  /** True when this node carries body text to lazy-fetch and render. */
  isContent: boolean;
  /** Whether the source node declared content (null content still a leaf). */
  contentPresent: boolean;
}

// Walk the outline depth-first (document order). Preamble + sections carry
// content; chapters/section_group are structural headings. All are rows so the
// reader shows the same hierarchy the outline describes.
function flattenOutline(nodes: TDocumentNodeOutline[]): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (list: TDocumentNodeOutline[]) => {
    for (const node of list) {
      const contentPresent =
        node.nodeType === "preamble" ||
        node.nodeType === "section" ||
        node.nodeType === "sub_section" ||
        node.nodeType === "clause";
      out.push({ ...node, isContent: contentPresent, contentPresent });
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

interface TocNode {
  id: string;
  label: string;
  level: number;
  children: TocNode[];
}

// Build the TOC from the outline tree directly (depth = nesting level).
function buildTocTree(nodes: TDocumentNodeOutline[]): TocNode[] {
  return nodes
    .filter((node) => node.nodeType !== "section_group")
    .map((node) => ({
      id: node.id,
      label: node.heading ?? node.title ?? node.identifier,
      level: node.depth,
      children: buildTocTree(node.children),
    }));
}

// One virtualized reader row. Structural containers render as an underlined
// heading; content nodes render the fetched body (or a skeleton while loading).
function ReaderRow({
  row,
  content,
  citation,
}: {
  row: FlatRow;
  content: string | null;
  citation: string | null;
}) {
  if (!row.isContent) {
    return (
      <div className="pt-8 pb-2">
        <h2 className="border-b pb-1 text-lg font-semibold tracking-tight">
          {row.heading ?? row.title ?? row.identifier}
        </h2>
      </div>
    );
  }

  return (
    <section className="py-4">
      <h3 className="mb-2 text-base font-semibold tracking-tight">
        {row.identifier && row.nodeType === "section"
          ? `${row.identifier}. ${row.heading ?? ""}`
          : row.heading ?? row.title ?? row.identifier}
      </h3>
      {content === null ? (
        <ChunkSkeleton />
      ) : (
        <div className="prose prose-neutral max-w-none dark:prose-invert prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-3 prose-hr:my-5 prose-table:my-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
      {citation && (
        <p className="mt-3 text-xs text-muted-foreground italic">{citation}</p>
      )}
    </section>
  );
}

function TocSidebar({
  tree,
  activeId,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeId: string | null;
  expanded: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Contents
        </h2>
        <TocTree
          tree={tree}
          activeId={activeId}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      </div>
    </aside>
  );
}

function TocMobile({
  tree,
  activeId,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeId: string | null;
  expanded: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
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
          activeId={activeId}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      </div>
    </details>
  );
}

function TocTree({
  tree,
  activeId,
  expanded,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeId: string | null;
  expanded: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (tree.length === 0) return null;
  return (
    <nav aria-label="Contents" className="space-y-0.5">
      {tree.map((node) => (
        <TocTreeNode
          key={node.id}
          node={node}
          activeId={activeId}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </nav>
  );
}

function TocTreeNode({
  node,
  activeId,
  expanded,
  onSelect,
  onToggle,
}: {
  node: TocNode;
  activeId: string | null;
  expanded: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === activeId;
  const isLevel1 = node.level <= 2;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.label}`}
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
          onClick={() => onSelect(node.id)}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            "min-w-0 flex-1 truncate rounded-md py-1 pr-2 text-left text-[13px] leading-snug transition-colors",
            isActive
              ? "bg-accent font-medium text-foreground"
              : cn(
                  "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  isLevel1 && "font-semibold",
                ),
          )}
        >
          {node.label}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul className="ml-2 space-y-0.5 border-l border-border/60 pl-1.5">
          {node.children.map((child) => (
            <TocTreeNode
              key={child.id}
              node={child}
              activeId={activeId}
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

// Shown while a section body is in flight; keeps the scrollbar position stable.
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
