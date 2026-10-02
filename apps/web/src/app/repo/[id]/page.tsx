import { REPO_DOCUMENT_IDS } from "@/lib/documents";

// Static export needs every route's params at build time.
export function generateStaticParams() {
  return REPO_DOCUMENT_IDS.map((id) => ({ id }));
}

// Deliberately empty for now — the document view will land here later.
export default function RepositoryDocumentPage() {
  return <main className="flex-1" />;
}