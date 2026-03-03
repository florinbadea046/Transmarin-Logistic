// ──────────────────────────────────────────────────────────
// Transport → Sub-pagină: Planificare Curse Zilnice
//
// TODO pentru studenți:
//   - Formular pentru crearea unei curse noi
//   - Selectare comandă, șofer, camion
//   - Calcul km gol vs km încărcat
//   - Vizualizare curse pe zi (calendar sau listă)
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TripsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Curse Zilnice</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Planificare Curse</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Lista curselor zilei cu status</li>
                <li>Formular: selectare comandă → șofer → camion</li>
                <li>Câmpuri km gol, km încărcat, cost combustibil</li>
                <li>Calendar sau vizualizare pe zi</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
