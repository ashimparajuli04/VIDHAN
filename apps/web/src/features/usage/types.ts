export type { TUsage } from "@vidhan/schema";

export type TUsageCountdown = {
  hours: number;
  minutes: number;
  totalMs: number;
};

export function usageCountdown(resetAt: string, now: number = Date.now()): TUsageCountdown {
  const totalMs = Math.max(0, new Date(resetAt).getTime() - now);
  const totalMinutes = Math.floor(totalMs / 60_000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMs,
  };
}

export function formatUsageCountdown(resetAt: string, now: number = Date.now()): string {
  const { hours, minutes } = usageCountdown(resetAt, now);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
