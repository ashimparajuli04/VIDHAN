import { DocumentRepo } from "@/components/documents/document-repo";
import { PageHeader } from "@/components/page-header";

export default function RepoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7 md:pb-24">
      <PageHeader title="Legal repository" description="Browse Nepal's legal documents." />

      <DocumentRepo />
    </main>
  );
}