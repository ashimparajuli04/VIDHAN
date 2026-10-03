"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import type { TChatMessageView } from "../types";
import { LawyerStep } from "./lawyer-step";
import { ReferenceChips } from "./reference-chips";
import { SupportOfferCard } from "./support-offer-card";
import { ThinkingDots } from "./thinking-dots";

export function MessageBubble({
  message,
  thinking = false,
}: {
  message: TChatMessageView;
  thinking?: boolean;
}) {
  const isUser = message.role === "user";

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
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
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
      </div>
    </div>
  );
}