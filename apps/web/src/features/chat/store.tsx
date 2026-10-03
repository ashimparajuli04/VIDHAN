"use client";

import * as React from "react";

import { createSession as createSessionRequest, listSessions } from "./api";
import type { TChatContextValue, TChatSessionView } from "./types";

const ChatContext = React.createContext<TChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = React.useState<TChatSessionView[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list.map((session) => ({ id: session.id, title: session.title })));
    } catch {
      // The sidebar list is non-critical; keep the last known sessions.
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSession = React.useCallback(async () => {
    const session = await createSessionRequest();
    return session.id;
  }, []);

  // The title streams in before `refresh` runs, so insert the row if the new
  // session is not in the list yet.
  const setSessionTitle = React.useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.some((session) => session.id === id)
        ? prev.map((session) => (session.id === id ? { ...session, title } : session))
        : [{ id, title }, ...prev]
    );
  }, []);

  const value = React.useMemo<TChatContextValue>(
    () => ({ sessions, createSession, refresh, setSessionTitle }),
    [sessions, createSession, refresh, setSessionTitle]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): TChatContextValue {
  const context = React.useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}
