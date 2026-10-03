import type {
  TAuthLogin,
  TAuthRegister,
  TAuthUpdate,
  TPublicUser,
} from "@vidhan/schema";

export type TAuthStatus = "loading" | "authenticated" | "unauthenticated";

export type TAuthContextValue = {
  user: TPublicUser | null;
  status: TAuthStatus;
  login: (input: TAuthLogin) => Promise<void>;
  register: (input: TAuthRegister) => Promise<void>;
  update: (input: TAuthUpdate) => Promise<void>;
  logout: () => void;
};
