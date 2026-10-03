import type { TPublicLawyer } from "@vidhan/schema";

export type TChatRole = "user" | "assistant";

export type TLawyerSearch = {
  query: string;
  lawyers: TPublicLawyer[];
};

export type TChatMessageView = {
  id: string;
  role: TChatRole;
  content: string;
  /** Present on an assistant turn that ran the lawyer search. */
  lawyerSearch?: TLawyerSearch;
};

export type TChatSessionView = {
  id: string;
  title: string;
  messages: TChatMessageView[];
};

export type TStreamStatus = "idle" | "thinking" | "streaming" | "searching";

export type TChatMode = "general" | "research";

export type TChatContextValue = {
  sessions: TChatSessionView[];
  status: TStreamStatus;
  streamingSessionId: string | null;
  mode: TChatMode;
  createSession: (title: string) => string;
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  stop: () => void;
  setMode: (mode: TChatMode) => void;
};
