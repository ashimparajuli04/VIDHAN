"use client";

import * as React from "react";
import type { TAuthLogin, TAuthRegister, TPublicUser } from "@vidhan/schema";

import {
  ApiError,
  fetchMe,
  login as loginRequest,
  register as registerRequest,
} from "./api";
import { clearToken, readToken, writeToken } from "./storage";
import type { TAuthContextValue, TAuthStatus } from "./types";

const AuthContext = React.createContext<TAuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<TPublicUser | null>(null);
  const [status, setStatus] = React.useState<TAuthStatus>("loading");

  React.useEffect(() => {
    const token = readToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;
    fetchMe(token)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Only a 401 proves the token is dead; keep it on transient failures
        // so a refresh can recover the session.
        if (error instanceof ApiError && error.status === 401) clearToken();
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (input: TAuthLogin) => {
    const { token, user: me } = await loginRequest(input);
    writeToken(token);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = React.useCallback(async (input: TAuthRegister) => {
    const { token, user: me } = await registerRequest(input);
    writeToken(token);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const logout = React.useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = React.useMemo<TAuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): TAuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
