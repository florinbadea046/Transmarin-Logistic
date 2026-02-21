// ──────────────────────────────────────────────────────────
// Pagina 404 — Not Found
// ──────────────────────────────────────────────────────────

import { Link } from "@tanstack/react-router";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <FileX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Pagina nu a fost găsită.</p>
      <Button asChild>
        <Link to="/">Înapoi la Dashboard</Link>
      </Button>
    </div>
  );
}
