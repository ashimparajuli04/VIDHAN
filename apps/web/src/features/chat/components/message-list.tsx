"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { TChatMessageView, TStreamStatus } from "../types";
import { MessageBubble } from "./message-bubble";

const NEAR_BOTTOM_PX = 48;

export function MessageList({
  messages,
  status,
}: {
  messages: TChatMessageView[];
  status: TStreamStatus;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  React.useEffect(() => {
    const viewport = rootRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;
    viewportRef.current = viewport;

    const handleScroll = () => {
      const distance =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setAtBottom(distance < NEAR_BOTTOM_PX);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  // Follow the stream while the reader stays near the bottom; once they
  // scroll up, leave them where they are.
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !atBottom) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, status, atBottom]);

  const lastId = messages[messages.length - 1]?.id;

  return (
    <div ref={rootRef} className="relative min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              thinking={status === "thinking" && message.id === lastId}
            />
          ))}
        </div>
      </ScrollArea>

      {!atBottom && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            viewport.scrollTop = viewport.scrollHeight;
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
        >
          <ArrowDown />
          Jump to latest
        </Button>
      )}
    </div>
  );
}
