// ──────────────────────────────────────────────────────────
// Transport → Sub-pagină: Gestiune Comenzi
//
// TODO pentru studenți:
//   - Tabel TanStack Table cu toate comenzile
//   - Import din CSV / Excel (papaparse, xlsx)
//   - Filtrare după status, client, dată
//   - Adăugare / editare / ștergere comenzi
//   - Export date
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrdersPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Comenzi</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Gestiune Comenzi</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Tabel TanStack Table cu comenzile din localStorage</li>
                <li>Buton „Import CSV/Excel" (papaparse / xlsx)</li>
                <li>Filtrare după status, client, perioadă</li>
                <li>Adăugare / Editare / Ștergere (React Hook Form + Zod)</li>
                <li>Export date în CSV</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
