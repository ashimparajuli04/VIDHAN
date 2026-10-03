import { Skeleton } from "@/components/ui/skeleton";

export function FullShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden w-72 shrink-0 flex-col gap-3 border-r border-border p-4 md:flex">
        <Skeleton className="h-10 w-32" />
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
          <Skeleton className="size-7" />
        </div>
        <div className="flex flex-1 items-start justify-center p-8">
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
    </div>
  );
}
