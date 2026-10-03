"use client";

import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Pencil } from "lucide-react";

import {
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  // The assistant's copy button floats below the bubble and is always
  // visible, so clear room for it when attachments follow the text.
  const hasBelow = Boolean(
    message.lawyerSearch ||
      message.supportOffer ||
      message.references ||
      message.sources
  );

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

        {message.content && (
          <Bubble
            variant={isUser ? "default" : "outline"}
            align={isUser ? "end" : "start"}
            // The assistant bubble spans the row like a document pane; the
            // user bubble sizes to its own text.
            className={cn(
              // Bubble's built-in max-w-[80%] resolves against this
              // shrink-to-fit column, so it caps the bubble at 80% of its own
              // text width and every message wraps early. The column's own
              // 85% cap is the real limit for the user bubble.
              isUser && "max-w-none",
              !isUser && "w-full max-w-full",
              !isUser && hasBelow && "mb-6"
            )}
          >
            <BubbleContent
              className={cn(
                isUser
                  ? "rounded-[22px] rounded-br-md px-5 py-3 text-[15px] whitespace-pre-wrap"
                  : // `!` wins over the variant's `*:data-[slot=bubble-content]:bg-*` selector
                    // so the assistant keeps the card panel it had before.
                    "w-full !bg-card rounded-[22px] rounded-bl-md px-5 py-3 text-[15px]"
              )}
            >
              {isUser ? (
                message.content
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:first:mt-0 prose-p:last:mb-0">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </Markdown>
                </div>
              )}
            </BubbleContent>

            <BubbleReactions
              side="bottom"
              align={isUser ? "end" : "start"}
              // Bare icon row floating below the bubble: the pill
              // background/ring come from the default styling, so strip them
              // and push the row past the bubble edge with a gap.
              className={cn(
                "translate-y-[calc(100%+0.25rem)] bg-transparent ring-0",
                isUser &&
                  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy message"}
                title={copied ? "Copied" : "Copy"}
                className="size-8 text-foreground hover:bg-transparent hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>

              {isUser && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRestoreQuery?.(message.content)}
                  aria-label="Edit message"
                  title="Edit"
                  className="size-8 text-foreground hover:bg-transparent hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
            </BubbleReactions>
          </Bubble>
        )}

        {/* Tool parts stream in before the answer text, so these would
            otherwise pop in above the (not yet written) text. Show them
            only once the turn's text has started. */}
        {message.content && message.lawyerSearch && (
          <LawyerStep search={message.lawyerSearch} />
        )}

        {message.content && message.supportOffer && (
          <SupportOfferCard offer={message.supportOffer} />
        )}

        {message.content && message.references && (
          <ReferenceChips references={message.references} />
        )}
      </div>
    </div>
  );
}