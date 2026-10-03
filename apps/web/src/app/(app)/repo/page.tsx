import { DocumentRepo } from "@/components/documents/document-repo";

export default function RepoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 md:px-8 md:pb-24">
      <header className="mb-8 md:mb-10">
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] md:text-[44px] md:leading-[1.05]">
          Legal repository
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-snug text-muted-foreground">
          Browse Nepal&apos;s legal documents.
        </p>
      </header>

      <DocumentRepo />
    </main>
  );
}