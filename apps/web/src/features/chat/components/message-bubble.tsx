"use client";

import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { TChatMessageView } from "../types";
import { LawyerStep } from "./lawyer-step";
import { ReferenceChips } from "./reference-chips";
import { SupportOfferCard } from "./support-offer-card";
import { ThinkingDots } from "./thinking-dots";

export function MessageBubble({
  message,
  thinking = false,
  onRestoreQuery,
}: {
  message: TChatMessageView;
  thinking?: boolean;
  /** Seeds the composer with the message text, so the user can resend an edited prompt. */
  onRestoreQuery?: (query: string) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      return; // Clipboard unavailable (e.g. non-secure context); leave as is.
    }
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  if (
    !isUser &&
    !message.content &&
    !thinking &&
    !message.lawyerSearch &&
    !message.sources &&
    !message.references &&
    !message.supportOffer
  ) {
    return null;
  }

  return (
    <div className={cn("group flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col gap-3",
          isUser && "items-end"
        )}
      >
        {thinking && (
          <div className="w-fit rounded-full bg-muted px-2 py-1">
            <ThinkingDots />
          </div>
        )}

        {message.content ? (
          isUser ? (
            <div className="rounded-[22px] rounded-br-md bg-primary px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere text-primary-foreground">
              {message.content}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-[22px] rounded-bl-md border border-border bg-card px-5 py-3 text-[15px] leading-relaxed prose-p:my-1.5 prose-p:first:mt-0 prose-p:last:mb-0">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )
        ) : null}

        {message.lawyerSearch && <LawyerStep search={message.lawyerSearch} />}

        {message.supportOffer && (
          <SupportOfferCard offer={message.supportOffer} />
        )}

        {message.references && (
          <ReferenceChips references={message.references} />
        )}

        {message.content && (
          <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy message"}
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <Check /> : <Copy />}
            </Button>

            {isUser && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onRestoreQuery?.(message.content)}
                aria-label="Edit message"
                title="Edit"
              >
                <Pencil />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}