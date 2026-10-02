import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { TRepoDocument } from "@/lib/documents";

export function DocumentRow({ document }: { document: TRepoDocument }) {
  return (
    <li>
      <Link
        href={`/repo/${document.id}`}
        className="group flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 sm:px-4"
      >
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
          {document.title}
        </span>
        {typeof document.year === "number" && (
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {document.year}
          </span>
        )}
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}