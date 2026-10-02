import type { Metadata } from "next";

import { LawyerProfile } from "@/components/lawyers/lawyer-profile";
import { LAWYER_IDS } from "@/lib/lawyers";

export const metadata: Metadata = {
  title: "Lawyer Profile · Vidhan",
};

// Static export needs every param at build time; the seed ids stand in
// (see docs/web-lawyer-details.md).
export function generateStaticParams() {
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