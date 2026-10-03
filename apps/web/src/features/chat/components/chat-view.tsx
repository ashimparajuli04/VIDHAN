"use client";

import * as React from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";

import { ZChatTitle } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import { readToken } from "@/features/auth/storage";
import { API_URL } from "@/lib/api";

import { deriveStatus, historyToMessages, lastUserText, toMessageViews } from "../adapt";
import { getSession } from "../api";
import { useChat } from "../store";
import { ChatComposer } from "./chat-composer";
import { ChatEmpty } from "./chat-empty";
import { MessageList } from "./message-list";

export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { createSession, refresh, setSessionTitle } = useChat();

  // Session the transport targets. Set before the first send so the stream
  // request has an id even before router.replace lands.
  const activeIdRef = React.useRef<string | null>(null);
  const loadRef = React.useRef(0);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState(false);
  const [sendError, setSendError] = React.useState(false);
  const [seed, setSeed] = React.useState<{ value: string; nonce: number } | null>(
    null
  );
  const pendingRef = React.useRef("");

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        prepareSendMessagesRequest: ({ messages }) => ({
          api: `${API_URL}/chat/sessions/${activeIdRef.current}/messages`,
          body: { content: lastUserText(messages) },
          headers: { authorization: `Bearer ${readToken() ?? ""}` },
        }),
      }),
    []
  );

  const {
    messages,
    sendMessage,
    status: aiStatus,
    stop,
    error,
    regenerate,
    setMessages,
  } = useAiChat({
    transport,
    onFinish: () => void refresh(),
    // Streamed as soon as the first message's title is generated, so the
    // sidebar names the chat while the answer is still streaming.
    onData: (part) => {
      if (part.type !== "data-title") return;
      const parsed = ZChatTitle.safeParse(part.data);
      if (parsed.success) setSessionTitle(parsed.data.sessionId, parsed.data.title);
    },
  });

  const loadHistory = React.useCallback(
    async (sessionId: string) => {
      const run = ++loadRef.current;
      setHistoryError(false);
      setHistoryLoading(true);
      try {
        const { messages: history } = await getSession(sessionId);
        if (loadRef.current !== run) return;
        setMessages(historyToMessages(history));
      } catch {
        if (loadRef.current !== run) return;
        setHistoryError(true);
      } finally {
        if (loadRef.current === run) setHistoryLoading(false);
      }
    },
    [setMessages]
  );

  React.useEffect(() => {
    // A session we just minted is already driven by this useChat instance.
    if (id === activeIdRef.current) return;
    activeIdRef.current = id;

    if (!id) {
      loadRef.current += 1;
      setHistoryError(false);
      setHistoryLoading(false);
      setMessages([]);
      return;
    }

    void loadHistory(id);
  }, [id, loadHistory, setMessages]);

  const status = deriveStatus(aiStatus, messages);
  const streaming = aiStatus === "submitted" || aiStatus === "streaming";
  const views = toMessageViews(messages, status);

  async function handleSend(content: string) {
    pendingRef.current = content;
    setSendError(false);
    if (!id) {
      try {
        const sessionId = await createSession();
        activeIdRef.current = sessionId;
        router.replace(`/chat?id=${sessionId}`);
      } catch {
        setSendError(true);
        return;
      }
    }
    // A stream failure surfaces via the `error` state below, not a throw.
    void sendMessage({ text: content });
  }

  function retry() {
    if (error || aiStatus === "error") {
      void regenerate();
      return;
    }
    if (sendError && pendingRef.current) {
      void handleSend(pendingRef.current);
      return;
    }
    if (id) void loadHistory(id);
  }

  function restoreQuery(query: string) {
    void stop();
    setSeed({ value: query, nonce: Date.now() });
  }

  return (
    <main className="flex h-[calc(100svh-3rem)] flex-col overflow-hidden">
      {historyLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading conversation…
        </div>
      ) : views.length === 0 ? (
        <ChatEmpty onPick={handleSend} />
      ) : (
        <MessageList
          messages={views}
          status={status}
          onRestoreQuery={restoreQuery}
        />
      )}

      {(error || sendError || historyError) && (
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-3 text-sm text-muted-foreground">
          <span>Something went wrong.</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      <ChatComposer
        streaming={streaming}
        onSend={handleSend}
        onStop={stop}
        seed={seed}
      />
    </main>
  );
}
