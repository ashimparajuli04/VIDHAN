import { Skeleton } from "@/components/ui/skeleton";

// Mirrors LawyerProfile's loaded layout (hero row, pills, sections,
// sticky aside, related row) so nothing shifts when the data arrives.
export function LawyerProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading lawyer profile"
      className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12"
    >
      <div className="min-w-0 space-y-8">
        {/* Hero */}
        <section className="space-y-5">
          <div className="flex items-center gap-4 md:gap-6">
            <Skeleton className="size-20 shrink-0 rounded-full md:size-28" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-8 w-56 max-w-full rounded-md" />
              <Skeleton className="h-5 w-72 max-w-full rounded-md" />
            </div>
          </div>

          {/* Practice-area pills */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </section>

        {/* About */}
        <section className="space-y-3 border-t pt-8">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </section>

        {/* Consultation */}
        <section className="space-y-3 border-t pt-8">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-5 w-52 rounded-md" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </section>

        {/* Courts */}
        <section className="space-y-3 border-t pt-8">
          <Skeleton className="h-6 w-16 rounded-md" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </section>

        {/* Education & credentials */}
        <section className="space-y-3 border-t pt-8">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-4 w-3/5 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-4 w-2/5 rounded-md" />
        </section>

        {/* Languages line */}
        <div className="border-t pt-8">
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
      </div>

      {/* Sticky aside: CTA block + facts */}
      <aside className="hidden lg:block">
        <div className="space-y-5 rounded-xl border bg-card/40 p-5">
          <Skeleton className="h-11 w-full rounded-md" />
          <dl className="divide-y divide-border">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* Related row sits below the grid, outside the two columns */}
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-6 w-72 rounded-md" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3.5 w-1/2 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}