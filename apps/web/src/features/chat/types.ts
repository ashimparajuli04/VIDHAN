import type { TPublicLawyer, TReference } from "@vidhan/schema";

export type TChatRole = "user" | "assistant";

export type TLawyerSearch = {
  query: string;
  lawyers: TPublicLawyer[];
  /** Terminal states mean the search completed; only then is an empty list "none found". */
  state: "pending" | "done" | "error";
};

export type TChatMessageView = {
  id: string;
  role: TChatRole;
  content: string;
  /** Present on an assistant turn that ran the lawyer search. */
  lawyerSearch?: TLawyerSearch;
  /** Document-retrieval steps, in call order. */
  sources?: TSourceStep[];
  /** Provisions the answer relied on, from the `cite` tool. */
  references?: TReference[];
};

/** A retrieval tool call shown while the answer is being researched. */
export type TSourceStep = {
  id: string;
  label: string;
  running: boolean;
  /** Set for get_section rows; the rest render label-only. */
  title?: string;
};

/** Sidebar summary. Message history is fetched per session, not held here. */
export type TChatSessionView = {
  id: string;
  title: string;
};

export type TStreamStatus = "idle" | "thinking" | "streaming" | "searching";

export type TChatContextValue = {
  sessions: TChatSessionView[];
  createSession: () => Promise<string>;
  refresh: () => Promise<void>;
  /** Upserts a session with a streamed title, before a full refresh lands. */
  setSessionTitle: (id: string, title: string) => void;
};
