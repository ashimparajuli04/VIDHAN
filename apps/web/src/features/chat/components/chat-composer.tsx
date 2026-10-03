"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUsage, useUsageCountdown } from "@/features/usage/provider";

import { useChat } from "../store";

const MAX_HEIGHT_PX = 200;

export function ChatComposer({
  streaming,
  onSend,
  onStop,
  seed,
}: {
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  seed?: { value: string; nonce: number } | null;
}) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { mode, setMode } = useChat();
  const { usage } = useUsage();

  const overLimit = usage !== null && usage.used >= usage.limit;
  const resetCountdown = useUsageCountdown(overLimit ? usage?.resetAt : null);

  // A Stop puts the in-flight turn back in the box for editing.
  React.useEffect(() => {
    if (!seed) return;
    setValue(seed.value);
    textareaRef.current?.focus();
  }, [seed]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  function submit() {
    const content = value.trim();
    if (!content || streaming || overLimit) return;
    onSend(content);
    setValue("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    // Floating pill composer; the send action is a dark circle inside it.
    <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        {overLimit && (
          <p className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Your session limit is over. Session usage will be reset in{" "}
            {resetCountdown}.
          </p>
        )}

        <div className="flex items-end gap-1.5 rounded-full border border-border bg-white p-1.5 pl-5 transition-[border-color] focus-within:border-ring/70 dark:bg-white/[0.06]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={overLimit}
            placeholder={overLimit ? "Session limit reached" : "Ask about a legal issue…"}
            aria-label="Message"
            className="max-h-[200px] flex-1 resize-none self-center bg-transparent px-1 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-[15px]"
          />

          {streaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={submit}
              disabled={!value.trim() || overLimit}
              aria-label="Send message"
            >
              <ArrowUp />
            </Button>
          )}
        </div>

        {/* Full disclaimer on wide screens; shortened below sm to avoid wrapping */}
        <div className="mt-2.5 flex items-center justify-between gap-2 pl-3 pr-3 sm:gap-3 sm:pl-5 sm:pr-5">
          <p className="min-w-0 flex-1 truncate whitespace-nowrap text-left text-[clamp(0.625rem,1.75vw,0.8125rem)] text-muted-foreground">
            <span className="hidden sm:inline">
              Vidhan is AI and can make mistakes. Please double-check responses.
            </span>
            <span aria-hidden="true" className="sm:hidden">
              Vidhan is AI and can make mistakes.
            </span>
          </p>

          <button
            type="button"
            onClick={() => setMode(mode === "general" ? "research" : "general")}
            aria-pressed={mode === "research"}
            className="shrink-0 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Vidhan - {mode === "general" ? "General" : "Research"}
          </button>
        </div>
      </div>
    </div>
  );
}