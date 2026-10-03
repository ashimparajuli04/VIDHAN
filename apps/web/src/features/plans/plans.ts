import { USAGE_LIMITS } from "@vidhan/schema";

export type TPlanId = "free" | "subscribed" | "enterprise";

// Token line for a plan card. `null` means the plan has no fixed allocation
// (Enterprise) and the card renders "Custom token allocation" instead.
export type TPlanToken = { value: string; unit: string } | null;

export type TPlanMeta = {
  id: TPlanId;
  name: string;
  tagline: string;
  token: TPlanToken;
  features: readonly string[];
  ctaLabel: string;
  ctaHref?: string;
};

// 500_000 → "500K", 5_000_000 → "5M". Fall back to plain grouping for
// values that don't divide evenly; the plan limits are round numbers.
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000 && count % 1_000_000 === 0) {
    return `${count / 1_000_000}M`;
  }
  if (count >= 1_000 && count % 1_000 === 0) {
    return `${count / 1_000}K`;
  }
  return count.toLocaleString("en-US");
}

export const PLANS: readonly TPlanMeta[] = [
  {
    id: "free",
    name: "Free",
    tagline:
      "Get started with Vidhan and explore source-grounded legal intelligence.",
    token: { value: formatTokenCount(USAGE_LIMITS.free), unit: "tokens" },
    features: [
      "Access to Vidhan's core legal intelligence",
      "Limited usage",
      "No commitment",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/chat",
  },
  {
    id: "subscribed",
    name: "Subscribed",
    tagline: "More capacity for regular legal research and everyday use.",
    token: { value: formatTokenCount(USAGE_LIMITS.subscribed), unit: "tokens" },
    features: [
      "Higher usage limit",
      "Designed for frequent use",
      "Individual subscription",
    ],
    ctaLabel: "Subscribe",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline:
      "Built for organizations and teams with customized usage requirements.",
    token: null,
    features: [
      "Organization-wide access",
      "Multiple team members",
      "Custom usage limits",
      "Dedicated support",
      "Tailored to your organization's needs",
    ],
    ctaLabel: "Request Enterprise",
    ctaHref: "/enterprise/request",
  },
];