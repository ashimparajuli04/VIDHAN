import { DocumentRepo } from "@/components/documents/document-repo";

export default function RepoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-16 md:p-8 md:pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Legal Repository
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Browse Nepal&apos;s legal documents.
        </p>
      </header>

      <DocumentRepo />
    </main>
  );
}