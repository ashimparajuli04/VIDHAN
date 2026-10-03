import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { TRepoDocument } from "@/lib/documents";

export function DocumentRow({
  document,
  showDivider,
}: {
  document: TRepoDocument;
  /** Draws a hairline above the row (every row except the first of a group in the virtualized list). */
  showDivider?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/repo/${document.id}`}
        className={cn(
          "group flex min-h-14 items-center gap-3 rounded-md px-4 py-3.5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 sm:px-5",
          showDivider && "border-t border-border/70",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium">
          {document.title}
        </span>
        {typeof document.yearAd === "number" && (
          <span className="shrink-0 text-[15px] tabular-nums text-muted-foreground">
            {document.yearAd}
          </span>
        )}
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}