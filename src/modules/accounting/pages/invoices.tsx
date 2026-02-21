import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoicesPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Facturi</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Gestiune Facturi</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Tabel cu facturi intrare + ieșire</li>
                <li>Formular factură nouă (React Hook Form + Zod)</li>
                <li>Filtrare: tip, status, perioadă, furnizor</li>
                <li>Simulare atașament fișier (doar numele)</li>
                <li>Export CSV / Excel</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
