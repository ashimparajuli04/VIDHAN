"use client";

import { cn } from "@/lib/utils";

import type { TChatMessageView } from "../types";
import { LawyerStep } from "./lawyer-step";
import { ThinkingDots } from "./thinking-dots";

export function MessageBubble({
  message,
  thinking = false,
}: {
  message: TChatMessageView;
  thinking?: boolean;
}) {
  const isUser = message.role === "user";

  if (!isUser && !message.content && !thinking && !message.lawyerSearch) {
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
        {thinking && !message.content ? (
          <div className="rounded-full bg-muted px-2 py-1">
            <ThinkingDots />
          </div>
        ) : message.content ? (
          <div
            className={cn(
              "rounded-[22px] px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere",
              isUser
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md border border-border bg-card text-foreground"
            )}
          >
            {message.content}
          </div>
        ) : null}

        {message.lawyerSearch && <LawyerStep search={message.lawyerSearch} />}
      </div>
    </div>
  );
}
