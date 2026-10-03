"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { TLawyerSearch } from "../types";
import { LawyerResultCard } from "./lawyer-result-card";

export function LawyerStep({ search }: { search: TLawyerSearch }) {
  const [open, setOpen] = React.useState(false);
  const searching = search.lawyers.length === 0;

  return (
    <div className="w-full space-y-3">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="rounded-lg border bg-card/50"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13px] text-muted-foreground">
          {searching ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <Check className="size-4 shrink-0 text-primary" />
          )}

          <span className="flex-1 text-left">
            {searching
              ? "Searching for lawyers…"
              : `Found ${search.lawyers.length} lawyers`}
          </span>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <pre className="overflow-x-auto border-t px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {search.query}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {!searching && (
        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-muted-foreground">
              Recommended lawyers
            </p>

            <div className="flex items-center gap-1">
              <CarouselPrevious className="static size-8 translate-y-0" />
              <CarouselNext className="static size-8 translate-y-0" />
            </div>
          </div>

          <CarouselContent className="mt-3 ml-0 gap-4">
            {search.lawyers.map((lawyer) => (
              <CarouselItem
                key={lawyer.id}
                className="basis-[85%] pl-0 sm:basis-1/2"
              >
                <LawyerResultCard lawyer={lawyer} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}
