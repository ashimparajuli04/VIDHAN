import { DocumentRepo } from "@/components/documents/document-repo";

export default function RepoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7 md:pb-24">
      <header className="mb-10 md:mb-12">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-[36px] md:leading-[1.1]">
          Legal repository
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-snug text-muted-foreground md:text-[16px]">
          Browse Nepal&apos;s legal documents.
        </p>
      </header>

      <DocumentRepo />
    </main>
  );
}