"use client";

import Link from "next/link";

import type { TReference } from "@vidhan/schema";

import { cn } from "@/lib/utils";

/** Cited-only footer: the provisions the answer said it relied on. */
export function ReferenceChips({ references }: { references: TReference[] }) {
  if (references.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {references.map((ref) => (
        <Link
          key={ref.nodeId}
          href={`/repo/${encodeURIComponent(ref.documentId)}?node=${encodeURIComponent(ref.nodeId)}`}
          title={ref.citation ?? undefined}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-full border bg-card/50",
            "px-2.5 py-0.5 text-xs text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          )}
        >
          <span className="shrink-0 font-medium text-foreground/80">
            §{ref.identifier}
          </span>
          {ref.heading && (
            <span className="min-w-0 truncate">· {ref.heading}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
