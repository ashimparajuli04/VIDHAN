import type { TAuthLogin, TAuthRegister, TPublicUser } from "@vidhan/schema";

export type TAuthStatus = "loading" | "authenticated" | "unauthenticated";

export type TAuthContextValue = {
  user: TPublicUser | null;
  status: TAuthStatus;
  login: (input: TAuthLogin) => Promise<void>;
  register: (input: TAuthRegister) => Promise<void>;
  logout: () => void;
};
