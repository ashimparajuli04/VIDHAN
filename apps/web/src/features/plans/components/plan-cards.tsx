"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PLANS } from "../plans";
import type { TPlanId } from "../plans";

// Three-card plan section: stacked on mobile, one column per plan on
// desktop. The current plan carries an accent badge and a "Current Plan"
// CTA; every other CTA starts its own flow.
export function PlanCards({ currentPlan }: { currentPlan: TPlanId | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        return (
          <Card
            key={plan.id}
            className="flex flex-col rounded-[var(--radius)]"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {isCurrent && <Badge variant="accent">Current Plan</Badge>}
              </div>
              <CardDescription className="text-[15px] leading-relaxed">
                {plan.tagline}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col">
              {plan.token ? (
                <p className="text-3xl font-extrabold tracking-tight">
                  {plan.token.value}
                  <span className="ml-1.5 text-[15px] font-semibold text-muted-foreground">
                    {plan.token.unit}
                  </span>
                </p>
              ) : (
                <p className="text-2xl font-extrabold tracking-tight">
                  Custom token allocation
                </p>
              )}

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[15px]"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                {isCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full"
                  >
                    Current Plan
                  </Button>
                ) : plan.ctaHref ? (
                  <Button asChild className="w-full">
                    <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                  </Button>
                ) : (
                  // No payment flow exists — subscription is an admin-only
                  // flag — so Subscribe has no action behind it yet.
                  <Button type="button" className="w-full">
                    {plan.ctaLabel}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}