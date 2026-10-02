import { LawyerCatalogue } from "@/components/lawyers/lawyer-catalogue";

export default function LawyersPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-16 md:p-8 md:pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Lawyer Catalogue
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
          Browse legal professionals across Nepal and book a consultation.
        </p>
      </header>

      <LawyerCatalogue />
    </main>
  );
}