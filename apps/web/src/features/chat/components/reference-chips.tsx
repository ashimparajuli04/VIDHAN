"use client";

import type { TReference } from "@vidhan/schema";

import { cn } from "@/lib/utils";

/** Cited-only footer: the provisions the answer said it relied on. */
export function ReferenceChips({ references }: { references: TReference[] }) {
  if (references.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {references.map((ref) => (
        <span
          key={ref.nodeId}
          title={ref.citation ?? undefined}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-full border bg-card/50",
            "px-2.5 py-0.5 text-xs text-muted-foreground"
          )}
        >
          <span className="shrink-0 font-medium text-foreground/80">
            §{ref.identifier}
          </span>
          {ref.heading && (
            <span className="min-w-0 truncate">· {ref.heading}</span>
          )}
        </span>
      ))}
    </div>
  );
}
