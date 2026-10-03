import { LawyerCatalogue } from "@/components/lawyers/lawyer-catalogue";

export default function LawyersPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 md:px-8 md:pb-16">
      <header className="mb-8 md:mb-10">
        <h1 className="text-4xl font-extrabold tracking-[-0.03em] md:text-[44px] md:leading-[1.05]">
          Find a lawyer
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-snug text-muted-foreground">
          Browse legal professionals across Nepal and book a consultation.
        </p>
      </header>

      <LawyerCatalogue />
    </main>
  );
}