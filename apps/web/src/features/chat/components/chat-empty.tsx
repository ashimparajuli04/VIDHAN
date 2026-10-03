"use client";

import { useChat } from "../store";

import { CHAT_SUGGESTIONS } from "../mock";

export function ChatEmpty({ onPick }: { onPick: (prompt: string) => void }) {
  const { mode } = useChat();
  const modeLabel = mode === "research" ? "Research" : "General";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 py-10 sm:py-14">
        <div className="w-full space-y-9 text-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-chip px-4 py-1.5 text-[13px] font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              You&apos;re in {modeLabel} mode
            </span>

            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-[44px] sm:leading-[1.05]">
                How can I help you today?
              </h1>
              <p className="mx-auto max-w-md text-[17px] leading-snug text-muted-foreground">
                Ask a legal question or find the right lawyer for your issue.
              </p>
            </div>
          </div>

          {/* Quick replies are lowercase and conversational */}
          <div className="flex flex-wrap justify-center gap-2">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => onPick(suggestion.prompt)}
                className="rounded-full border border-border bg-chip px-4 py-2 text-[15px] transition-all duration-150 ease-out hover:border-foreground/20 hover:bg-white active:scale-[0.98] sm:px-5 sm:py-2.5 dark:hover:bg-white/[0.14]"
              >
                {suggestion.label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}