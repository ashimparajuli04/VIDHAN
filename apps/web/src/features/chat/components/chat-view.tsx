"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useChat } from "../store";
import { ChatComposer } from "./chat-composer";
import { ChatEmpty } from "./chat-empty";
import { MessageList } from "./message-list";

const MAX_TITLE_LENGTH = 48;

export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessions, status, createSession, sendMessage, stop } = useChat();

  const id = searchParams.get("id");
  const session = id ? sessions.find((item) => item.id === id) : undefined;
  const messages = session?.messages ?? [];
  const streaming = status !== "idle";

  function handleSend(content: string) {
    let targetId = id;
    if (!targetId || !session) {
      targetId = createSession(titleFrom(content));
      router.replace(`/chat?id=${targetId}`);
    }
    void sendMessage(targetId, content);
  }

  return (
    // Fixed to the viewport (no app header to subtract) so the message list
    // scrolls internally and the composer stays pinned.
    <main className="flex h-svh flex-col overflow-hidden">
      {messages.length === 0 ? (
        <ChatEmpty onPick={handleSend} />
      ) : (
        <MessageList messages={messages} status={status} />
      )}

      <ChatComposer streaming={streaming} onSend={handleSend} onStop={stop} />
    </main>
  );
}

function titleFrom(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > MAX_TITLE_LENGTH
    ? `${clean.slice(0, MAX_TITLE_LENGTH - 1)}…`
    : clean;
}
