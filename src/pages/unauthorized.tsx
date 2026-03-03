// ──────────────────────────────────────────────────────────
// Pagina Unauthorized — acces interzis pe bază de rol
// ──────────────────────────────────────────────────────────

import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <ShieldX className="h-16 w-16 text-red-500" />
      <h1 className="text-4xl font-bold">Acces Interzis</h1>
      <p className="text-muted-foreground">
        Nu aveți permisiunea de a accesa această pagină.
      </p>
      <Button asChild>
        <Link to="/">Înapoi la Dashboard</Link>
      </Button>
    </div>
  );
}
