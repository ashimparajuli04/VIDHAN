// Pulse-only placeholder for the profile page while the lawyer loads.
export function LawyerProfileSkeleton() {
  return (
    <div
      className="space-y-14 pt-10"
      aria-busy="true"
      aria-label="Loading lawyer profile"
    >
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="size-28 animate-pulse rounded-full bg-secondary md:size-32" />
        <div className="flex w-full max-w-xs flex-col items-center gap-3 lg:items-start lg:pt-2">
          <div className="h-8 w-52 animate-pulse rounded-md bg-secondary" />
          <div className="h-5 w-36 animate-pulse rounded-full bg-secondary" />
          <div className="h-4 w-48 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>

      {/* About */}
      <div className="space-y-3">
        <div className="h-5 w-16 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-full animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-secondary" />
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-8 w-24 animate-pulse rounded-full bg-secondary"
          />
        ))}
      </div>
    </div>
  );
}