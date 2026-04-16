// Fallback afisat cat un chunk lazy e incarcat.
// Spinner centrat, discret — nu deranjeaza vizual tranzitiile intre rute.

import { Loader2 } from "lucide-react";

export function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
