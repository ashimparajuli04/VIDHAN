"use client";

import * as React from "react";

import { useAuth } from "@/features/auth/provider";

import { replyFor, SEED_SESSIONS } from "./mock";
import type {
  TChatContextValue,
  TChatMessageView,
  TChatMode,
  TChatSessionView,
  TStreamStatus,
} from "./types";

// Faked turn timing. The whole turn lives in sendMessage so swapping it for
// the AI SDK useChat wiring later is a single-site change.
const THINKING_MS = 550;
const WORD_MS = 45;
const SEARCH_MS = 900;

const ChatContext = React.createContext<TChatContextValue | null>(null);

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = React.useState<TChatSessionView[]>(SEED_SESSIONS);
  const [status, setStatus] = React.useState<TStreamStatus>("idle");
  // Default follows the account's researcher flag; the composer toggle then
  // overrides it for the rest of the session.
  const [mode, setMode] = React.useState<TChatMode>(
    user?.isResearcher ? "research" : "general"
  );
  const [streamingSessionId, setStreamingSessionId] = React.useState<
    string | null
  >(null);
  // Incremented on every send and on stop; a run whose token no longer
  // matches is stale and bails after its current await.
  const runRef = React.useRef(0);

  const createSession = React.useCallback((title: string) => {
    const id = createId();
    setSessions((prev) => [{ id, title, messages: [] }, ...prev]);
    return id;
  }, []);

  const stop = React.useCallback(() => {
    runRef.current += 1;
    setStatus("idle");
    setStreamingSessionId(null);
  }, []);

  const sendMessage = React.useCallback(
    async (sessionId: string, content: string) => {
      const run = ++runRef.current;
      const assistantId = createId();
      const reply = replyFor(content);
      const alive = () => runRef.current === run;

      const patchAssistant = (patch: Partial<TChatMessageView>) => {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === assistantId
                      ? { ...message, ...patch }
                      : message
                  ),
                }
              : session
          )
        );
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  { id: createId(), role: "user", content },
                  { id: assistantId, role: "assistant", content: "" },
                ],
              }
            : session
        )
      );
      setStreamingSessionId(sessionId);
      setStatus("thinking");

      await delay(THINKING_MS);
      if (!alive()) return;

      setStatus("streaming");
      let streamed = "";
      for (const word of reply.text.split(/(\s+)/)) {
        if (!alive()) return;
        streamed += word;
        patchAssistant({ content: streamed });
        await delay(WORD_MS);
      }

      if (reply.search) {
        if (!alive()) return;
        setStatus("searching");
        patchAssistant({
          lawyerSearch: { query: reply.search.query, lawyers: [] },
        });
        await delay(SEARCH_MS);
        if (!alive()) return;
        patchAssistant({
          lawyerSearch: {
            query: reply.search.query,
            lawyers: reply.search.lawyers,
          },
        });
      }

      if (!alive()) return;
      setStatus("idle");
      setStreamingSessionId(null);
    },
    []
  );

  const value = React.useMemo<TChatContextValue>(
    () => ({
      sessions,
      status,
      streamingSessionId,
      mode,
      createSession,
      sendMessage,
      stop,
      setMode,
    }),
    [sessions, status, streamingSessionId, mode, createSession, sendMessage, stop]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): TChatContextValue {
  const context = React.useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}
