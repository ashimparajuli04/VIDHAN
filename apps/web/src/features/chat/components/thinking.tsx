"use client";

import * as React from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const NEAR_BOTTOM_PX = 48;

/**
 * Collapsible chain-of-thought panel, OpenCode-style: a compact pill that
 * stays collapsed and expands on click. While the model is still working the
 * pill carries a spinner so the turn never reads as a blank wait.
 */
export function Thinking({
  reasoning,
  active = false,
}: {
  /** Full chain-of-thought for the turn, joined across steps. */
  reasoning?: string;
  /** True while the model is still working on this turn. */
  active?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  // Track whether the reader is pinned to the newest reasoning so streaming
  // only chases the bottom while they haven't scrolled up inside the panel.
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleScroll = () => {
      const distance =
        panel.scrollHeight - panel.scrollTop - panel.clientHeight;
      setAtBottom(distance < NEAR_BOTTOM_PX);
    };

    panel.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => panel.removeEventListener("scroll", handleScroll);
  }, [open]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !atBottom) return;
    panel.scrollTop = panel.scrollHeight;
  }, [reasoning, active, atBottom, open]);

  return (
    <div className="w-fit max-w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active && "bg-muted/60"
        )}
      >
        {active ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 transition-transform duration-150",
              !open && "-rotate-90"
            )}
          />
        )}
        <span>
          {active ? "Vidhan is thinking…" : open ? "Hide reasoning" : "Show reasoning"}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          className={cn(
            "mt-2 max-h-80 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 px-4 py-3",
            "text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground"
          )}
        >
          {reasoning ?? (active ? "Thinking…" : "No reasoning was recorded.")}
        </div>
      )}
    </div>
  );
}
