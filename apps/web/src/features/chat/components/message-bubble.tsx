"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import type { TChatMessageView } from "../types";
import { LawyerStep } from "./lawyer-step";
import { ReferenceChips } from "./reference-chips";
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
    !message.references
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
          <div className="w-fit rounded-2xl bg-muted/60 px-2 py-1">
            <ThinkingDots />
          </div>
        )}

        {message.content ? (
          isUser ? (
            <div className="rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
              {message.content}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl bg-muted/60 px-4 py-2.5 text-sm leading-relaxed prose-p:my-1.5 prose-p:first:mt-0 prose-p:last:mb-0">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )
        ) : null}

        {message.lawyerSearch && <LawyerStep search={message.lawyerSearch} />}

        {message.references && (
          <ReferenceChips references={message.references} />
        )}
      </div>
    </div>
  );
}