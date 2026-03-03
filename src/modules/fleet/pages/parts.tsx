import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PartsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Piese & Consumabile</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Inventar Piese</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Tabel piese cu cantitate, preț unitar, furnizor</li>
                <li>Alertă vizuală dacă stoc &lt; stoc minim</li>
                <li>CRUD piese (adăugare, editare, ștergere)</li>
                <li>Alocare piesă → camion (selectare din dropdown)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
