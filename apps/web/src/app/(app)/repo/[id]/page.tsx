import type { Metadata } from "next";

import { DocumentDetail } from "@/components/documents/document-detail";
import { REPO_DOCUMENT_IDS } from "@/lib/document-ids.generated";

export const metadata: Metadata = {
  title: "Document · Vidhan",
};

// Static export needs every route's params at build time.
export function generateStaticParams() {
  return REPO_DOCUMENT_IDS.map((id) => ({ id }));
}

export default async function RepositoryDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentDetail id={id} />;
}