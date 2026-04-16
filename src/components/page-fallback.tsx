// Fallback afisat cat un chunk lazy e incarcat.
// Tine o structura stabila (Header + schelet card) ca sa evite layout shift.

import { Skeleton } from "@/components/ui/skeleton";

export function PageFallback() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
