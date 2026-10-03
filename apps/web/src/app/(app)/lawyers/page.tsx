import { LawyerCatalogue } from "@/components/lawyers/lawyer-catalogue";
import { PageHeader } from "@/components/page-header";

export default function LawyersPage() {
  return (
    // 1664 = the grid's 1600px cap below plus md:px-8 page padding, so the
    // grid cap (not the page) decides the column layout on wide screens.
    <main className="mx-auto w-full max-w-[1664px] flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7 md:pb-16">
      <PageHeader
        title="Find a lawyer"
        description="Browse legal professionals across Nepal and request a consultation."
      />

      <LawyerCatalogue />
    </main>
  );
}