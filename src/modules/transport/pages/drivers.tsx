// ──────────────────────────────────────────────────────────
// Transport → Sub-pagină: Șoferi & Camioane
//
// TODO pentru studenți:
//   - Lista șoferilor cu status (disponibil, în cursă, liber)
//   - Lista camioanelor cu asociere la șofer
//   - Formular de asociere șofer ↔ camion
//   - Vizualizare expirări (permis, atestat)
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DriversPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Șoferi & Camioane</h1>
      </Header>
      <Main>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Șoferi</CardTitle>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center text-muted-foreground">
              TODO: Tabel cu șoferi + status + asociere camion
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Camioane</CardTitle>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center text-muted-foreground">
              TODO: Tabel cu camioane + status + expirări ITP/RCA/vignetă
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
