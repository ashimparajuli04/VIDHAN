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
          <div className="rounded-2xl bg-muted/60 px-2 py-1">
            <ThinkingDots />
          </div>
        ) : message.content ? (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground"
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
