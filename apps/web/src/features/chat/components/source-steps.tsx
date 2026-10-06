"use client";

import * as React from "react";
import { Check, ChevronDown, CircleAlert, Loader2 } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { TSourceStep } from "../types";

/** Live "what am I reading" trail for the retrieval tools. */
export function SourceSteps({ steps }: { steps: TSourceStep[] }) {
  const [open, setOpen] = React.useState(false);
  const running = steps.filter((step) => step.state === "pending").length;
  const failed = steps.filter((step) => step.state === "error").length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full rounded-lg border bg-card/50"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        {running > 0 ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <Check className="size-3.5 shrink-0 text-emerald-600" />
        )}

        <span className="flex-1 text-left">
          {running > 0
            ? `Searching the legal corpus…`
            : failed > 0
              ? `Reviewed ${steps.length - failed} of ${steps.length} sources`
              : `Reviewed ${steps.length} source${steps.length === 1 ? "" : "s"}`}
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="space-y-1 border-t px-3 py-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {step.state === "pending" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : step.state === "error" ? (
                <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
              ) : (
                <Check className="size-3.5 shrink-0 text-emerald-600" />
              )}

              <span className="shrink-0">{step.label}</span>

              {step.title && (
                <span className="min-w-0 flex-1 truncate text-foreground/70">
                  {step.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
