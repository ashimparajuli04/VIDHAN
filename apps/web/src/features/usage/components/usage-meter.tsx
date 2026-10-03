"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getUsage } from "@/features/usage/api";
import { useUsageCountdown } from "@/features/usage/provider";
import type { TUsage } from "@/features/usage/types";

export function UsageMeter() {
  const [usage, setUsage] = React.useState<TUsage | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    getUsage()
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch(() => {
        // Non-critical: surface the empty state, don't crash the page.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resetAt = usage?.resetAt ?? null;
  const countdown = useUsageCountdown(resetAt);

  if (!usage) {
    return (
      <p className="text-sm text-muted-foreground">
        {loading ? "Loading usage…" : "Usage is unavailable right now."}
      </p>
    );
  }

  const { used, limit, isSubscribed } = usage;
  const percent =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const overLimit = used >= limit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Today</CardTitle>
          <Badge variant={isSubscribed ? "default" : "secondary"}>
            {isSubscribed ? "Subscribed" : "Free"}
          </Badge>
        </div>
        <CardDescription>
          {used.toLocaleString()} / {limit.toLocaleString()} tokens
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Daily token usage"
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              overLimit ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{percent}% used</span>
          <span>Resets in {countdown}</span>
        </div>
      </CardContent>
    </Card>
  );
}
