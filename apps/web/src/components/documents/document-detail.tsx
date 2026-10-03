"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import remarkGfm from "remark-gfm";

import type {
  TDocumentNode,
  TDocumentNodeOutline,
  TDocumentOutline,
  TPublicDocumentDetail,
} from "@vidhan/schema";
import { isDocumentContentNode, nodeLabel } from "@vidhan/schema";

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
// Viewport line (px from the top) a row must cross to count as the active section.
const TOP_LINE = 24;

// A row's resolved body: the node's own content plus any folded clause bodies,
// and the citation to display beneath it.
interface TBodies {
  content: string | null;
  citation: string | null;
}

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
  const [bodies, setBodies] = React.useState<ReadonlyMap<string, TBodies>>(
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
  const tocScrollRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  // Ignore scroll-spy updates while a TOC click is smooth-scrolling, so the
  // highlight doesn't flicker through every section it passes.
  const suppressSpyRef = React.useRef(false);

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
  const tocIndex = React.useMemo(
    () => (outline ? buildTocIndex(outline.nodes) : EMPTY_TOC_INDEX),
    [outline],
  );
  const tocTree = tocIndex.tree;
  const activeId = activeRow !== null ? rows[activeRow]?.id ?? null : null;

  const rowsRef = React.useRef(rows);
  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Scroll-spy: measure the rendered rows directly instead of trusting
  // Virtuoso's render range, whose 1200px overscan would make the highlight
  // trail the viewport. The active row is the last one whose top has crossed a
  // line near the top of the viewport.
  React.useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (suppressSpyRef.current) return;
      const items = container.querySelectorAll<HTMLElement>("[data-index]");
      if (items.length === 0) return;
      let next = -1;
      for (const item of items) {
        const index = Number(item.dataset.index);
        if (Number.isNaN(index)) continue;
        if (item.getBoundingClientRect().top <= TOP_LINE && index > next) {
          next = index;
        }
      }
      if (next < 0) next = Number(items[0]!.dataset.index);
      if (!Number.isNaN(next)) {
        setActiveRow((prev) => (prev === next ? prev : next));
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rows]);

  // Keep the reader's place visible: unfold the ancestors of the section at the
  // top of the viewport. Additive and keyed to the active id, so a manual
  // collapse is only overridden when the reader moves to a different branch.
  React.useEffect(() => {
    if (!activeId) return;
    const chain = tocIndex.ancestors.get(activeId);
    if (!chain || chain.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const nodeId of chain) {
        if (!next.has(nodeId)) {
          next.add(nodeId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeId, tocIndex]);

  // Bring the highlighted entry into the sidebar's own scroll viewport. The
  // sidebar is sticky over a window-scrolled list, so scroll it directly rather
  // than via scrollIntoView, which would move the page.
  React.useEffect(() => {
    const container = tocScrollRef.current;
    if (!container || !activeId) return;
    const active = container.querySelector<HTMLElement>('[aria-current="true"]');
    if (!active) return;
    const view = container.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.top < view.top) container.scrollTop -= view.top - item.top + 8;
    else if (item.bottom > view.bottom)
      container.scrollTop += item.bottom - view.bottom + 8;
  }, [activeId, expanded]);

  const fetchBody = React.useCallback(
    (node: FlatRow) => {
      if (bodies.has(node.id) || fetchingRef.current.has(node.id)) return;
      fetchingRef.current = new Set(fetchingRef.current).add(node.id);
      Promise.all([
        getDocumentNode(id, node.id),
        ...node.childIds.map((childId) => getDocumentNode(id, childId)),
      ])
        .then(([full, ...children]) => {
          if (!full) return;
          // A rule/section often carries no body itself; its text lives in the
          // clause children, so join them under the parent's citation.
          const parts = [full.content ?? ""];
          for (const child of children) parts.push(child?.content ?? "");
          const content = parts
            .map((part) => part.trim())
            .filter(Boolean)
            .join("\n\n");
          setBodies((prev) => {
            const next = new Map(prev);
            next.set(node.id, { content: content || null, citation: full.citation });
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
      if (row && row.kind === "section") void fetchBody(row);
    }
  }

  function scrollToNode(nodeId: string) {
    const index = rows.findIndex((row) => row.id === nodeId);
    if (index < 0) return;
    setActiveRow(index);
    suppressSpyRef.current = true;
    window.setTimeout(() => {
      suppressSpyRef.current = false;
    }, 700);
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
          className="-mx-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/repo">
            <ChevronLeft className="size-5" />
            All documents
          </Link>
        </Button>
      </nav>

      {status === "loading" && <ReaderSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-[15px] font-medium">Couldn&apos;t load this document</p>
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
      )}

      {status === "not-found" && (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Document not found
          </h1>
          <p className="text-[15px] text-muted-foreground">
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
              <p className="text-[15px] font-medium">
                No content available for this document yet
              </p>
              <p className="text-[15px] text-muted-foreground">
                The full text will appear here once it is published.
              </p>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              {hasToc && (
                <TocSidebar
                  tree={tocTree}
                  activeId={activeId}
                  expanded={expanded}
                  scrollRef={tocScrollRef}
                  onSelect={scrollToNode}
                  onToggle={toggleNode}
                />
              )}

              <div ref={listRef} className="min-w-0">
                {hasToc && (
                  <TocMobile
                    tree={tocTree}
                    activeId={activeId}
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

type RowKind = "heading" | "section";

interface FlatRow extends TDocumentNodeOutline {
  kind: RowKind;
  /**
   * Sub-provision ids (clauses) folded into this row. Their bodies are fetched
   * and concatenated under the parent's heading, so a rule whose text lives in
   * `(1)`, `(2)` children renders as one provision, not one row per clause.
   */
  childIds: string[];
}

// A clause child (`(1)`, `(a)`) has no heading; its identifier is the only
// label. It is a sub-provision, rendered inside its parent's row, never its own
// TOC entry or top-level row.
const CLAUSE_LABEL = /^\([\w]+\)$/;
const isClauseChild = (node: TDocumentNodeOutline) =>
  CLAUSE_LABEL.test(nodeLabel(node));

// Walk the outline depth-first (document order). Content nodes render as
// section rows with their clause children folded in; containers are structural
// headings. Bodies are not in the outline, so a section row with no body (an
// amendment caption, or a rule whose text is entirely in clause children) is
// only known after its fetch resolves.
function flattenOutline(nodes: TDocumentNodeOutline[]): FlatRow[] {
  const out: FlatRow[] = [];

  // Clause descendants of a content node, so their bodies can be concatenated
  // into the parent row. Stops at nested content nodes, which are their own rows.
  const collectClauses = (node: TDocumentNodeOutline): string[] => {
    const ids: string[] = [];
    for (const child of node.children) {
      if (isClauseChild(child)) {
        ids.push(child.id);
        ids.push(...collectClauses(child));
      }
    }
    return ids;
  };

  const walk = (list: TDocumentNodeOutline[]) => {
    for (const node of list) {
      if (isClauseChild(node)) continue;
      const isContent = isDocumentContentNode(node.nodeType);
      out.push({
        ...node,
        kind: isContent ? "section" : "heading",
        childIds: isContent ? collectClauses(node) : [],
      });
      // Content nodes already claimed their clause children; recurse only into
      // nested content nodes. Containers recurse into all children.
      const nested = isContent
        ? node.children.filter((child) => !isClauseChild(child))
        : node.children.filter((child) => !isClauseChild(child) || isContent);
      if (nested.length > 0) walk(nested);
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

interface TocIndex {
  tree: TocNode[];
  /** Outline-node id -> ids of its ancestor TOC nodes, for unfolding to it. */
  ancestors: ReadonlyMap<string, readonly string[]>;
}

const EMPTY_TOC_INDEX: TocIndex = { tree: [], ancestors: new Map() };

// Build the TOC from the outline tree directly (depth = nesting level).
// section_group is structural: it contributes no entry of its own, so its
// children are lifted to the parent's level rather than dropped with it. Bare
// clause markers are skipped entirely. The ancestor map lets the reader unfold
// the active section's branch as it scrolls.
function buildTocIndex(nodes: TDocumentNodeOutline[]): TocIndex {
  const ancestors = new Map<string, readonly string[]>();

  const walk = (
    list: TDocumentNodeOutline[],
    chain: readonly string[],
  ): TocNode[] => {
    const out: TocNode[] = [];
    for (const node of list) {
      if (isClauseChild(node)) continue;
      ancestors.set(node.id, chain);
      if (node.nodeType === "section_group") {
        out.push(...walk(node.children, chain));
        continue;
      }
      out.push({
        id: node.id,
        label: nodeLabel(node),
        level: node.depth,
        children: walk(node.children, [...chain, node.id]),
      });
    }
    return out;
  };

  return { tree: walk(nodes, []), ancestors };
}

// One virtualized reader row. Structural containers render as an underlined
// heading; section rows render the fetched body. A body that resolves to empty
// is a genuinely empty provision, not a pending one, so it keeps its heading
// and citation but shows nothing (no skeleton, no placeholder).
function ReaderRow({
  row,
  content,
  citation,
}: {
  row: FlatRow;
  content: string | null;
  citation: string | null;
}) {
  if (row.kind === "heading") {
    return (
      <div className="pt-8 pb-2">
        <h2 className="border-b pb-1 text-lg font-semibold tracking-tight">
          {nodeLabel(row)}
        </h2>
      </div>
    );
  }

  return (
    <section className="py-4">
      <h3 className="mb-2 text-base font-semibold tracking-tight">
        {row.identifier && row.nodeType === "section"
          ? `${row.identifier}. ${row.heading ?? ""}`
          : nodeLabel(row)}
      </h3>
      {content ? (
        <div className="prose prose-neutral max-w-none dark:prose-invert prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-3 prose-hr:my-5 prose-table:my-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : null}
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
  scrollRef,
  onSelect,
  onToggle,
}: {
  tree: TocNode[];
  activeId: string | null;
  expanded: ReadonlySet<string>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div
        ref={scrollRef}
        className="sticky top-8 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1"
      >
        <h2 className="mb-2 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
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
      <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 text-[15px] font-medium text-muted-foreground select-none">
        Contents
        <ChevronDown className="size-5 transition-transform group-open:rotate-180" />
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
                "size-4 transition-transform",
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
            "min-w-0 flex-1 truncate rounded-md py-1 pl-2 pr-2 text-left text-sm leading-snug transition-colors",
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
      <Skeleton className="mb-3 h-10 w-2/3" />
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton
            key={index}
            className={`h-[18px] ${index % 3 === 1 ? "w-4/5" : "w-full"}`}
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton
            key={index}
            className={`h-[18px] ${index % 3 === 0 ? "w-3/4" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}
