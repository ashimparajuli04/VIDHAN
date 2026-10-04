import type { Metadata } from "next";

import { LawyerProfile } from "@/components/lawyers/lawyer-profile";
import { LAWYER_IDS, getLawyers } from "@/lib/lawyers";

export const metadata: Metadata = {
  title: "Lawyer Profile · Vidhan",
};

// Static export needs every id at build time. Pull the live set from the
// API so new/real lawyers get their own page; fall back to the seed ids
// if the API isn't reachable during the build.
export async function generateStaticParams() {
  try {
    const lawyers = await getLawyers({});
    if (lawyers.length > 0) return lawyers.map((lawyer) => ({ id: lawyer.id }));
  } catch {
    // API unreachable at build time — use the seed fallback below.
  }
  return LAWYER_IDS.map((id) => ({ id }));
}

export default async function LawyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LawyerProfile id={id} />;
}