"use client";

import { useChat } from "../store";
import type { TChatMode } from "../types";

const MODE_DESCRIPTIONS: Record<TChatMode, string> = {
  general: "Practical legal answers, guidance, and lawyer connections",
  research: "In-depth legal analysis, sources, and research tools",
};

export function ChatEmpty() {
  const { mode } = useChat();
  const modeLabel = mode === "research" ? "Research" : "General";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 py-10 sm:py-14">
        <div className="w-full space-y-5 text-center">
          <div className="space-y-3">
            <h1 className="text-[clamp(2.25rem,5vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              How can I help you
              <br />
              today?
            </h1>
            <p className="mx-auto max-w-md text-[clamp(1rem,2vw,1.0625rem)] leading-snug text-muted-foreground">
              Ask a legal question or find the right lawyer for your issue.
            </p>
          </div>

          <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary px-4 py-1.5 text-[clamp(0.5625rem,2vw,0.8125rem)] font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 truncate">
              {modeLabel}: {MODE_DESCRIPTIONS[mode]}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

