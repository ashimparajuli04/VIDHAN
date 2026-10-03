"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUsage, useUsageCountdown } from "@/features/usage/provider";

export default function UsagePage() {
  const { usage, loading } = useUsage();
  const countdown = useUsageCountdown(usage?.resetAt);

  if (!usage) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading usage…" : "Usage is unavailable right now."}
        </p>
      </main>
    );
  }

  const { used, limit, isSubscribed } = usage;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const overLimit = used >= limit;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
      <header className="mb-8 md:mb-10">
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] md:text-[44px] md:leading-[1.05]">
          Usage
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-snug text-muted-foreground">
          Your token usage for today. It resets every midnight in Nepal.
        </p>
      </header>

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
              className={[
                "h-full rounded-full transition-[width]",
                overLimit ? "bg-destructive" : "bg-primary",
              ].join(" ")}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{percent}% used</span>
            <span>Resets in {countdown}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
