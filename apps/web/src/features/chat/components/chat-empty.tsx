"use client";

import { Scale } from "lucide-react";

import { useAuth } from "@/features/auth/provider";

import { CHAT_SUGGESTIONS } from "../mock";

export function ChatEmpty({ onPick }: { onPick: (prompt: string) => void }) {
  const { user } = useAuth();
  const mode = user?.isResearcher ? "Research" : "Enquiry";

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Scale className="size-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              How can I help?
            </h1>
            <p className="text-sm text-muted-foreground">
              Ask a legal question or find the right lawyer for your issue.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {mode} mode
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onPick(suggestion.prompt)}
              className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
