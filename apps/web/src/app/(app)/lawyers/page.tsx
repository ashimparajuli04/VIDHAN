import { LawyerCatalogue } from "@/components/lawyers/lawyer-catalogue";

export default function LawyersPage() {
  return (
    // 1664 = the grid's 1600px cap below plus md:px-8 page padding, so the
    // grid cap (not the page) decides the column layout on wide screens.
    <main className="mx-auto w-full max-w-[1664px] flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7 md:pb-16">
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