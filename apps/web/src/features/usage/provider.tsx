"use client";

import * as React from "react";

import { getUsage } from "./api";
import { formatUsageCountdown } from "./types";
import type { TUsage } from "./types";

export type TUsageContextValue = {
  usage: TUsage | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UsageContext = React.createContext<TUsageContextValue | null>(null);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = React.useState<TUsage | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setUsage(await getUsage());
    } catch {
      // Non-critical: keep the last known usage until the next refresh.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo<TUsageContextValue>(
    () => ({ usage, loading, refresh }),
    [usage, loading, refresh]
  );

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage(): TUsageContextValue {
  const context = React.useContext(UsageContext);
  if (!context) throw new Error("useUsage must be used within a UsageProvider");
  return context;
}

// Ticks the reset countdown so the banner and usage page stay live.
export function useUsageCountdown(resetAt: string | null | undefined): string {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!resetAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resetAt]);

  return resetAt ? formatUsageCountdown(resetAt, now) : "";
}
