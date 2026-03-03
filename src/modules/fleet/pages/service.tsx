import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServicePage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Service & Reparații</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Istoric Service</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Tabel cu istoricul reparațiilor per camion</li>
                <li>Formular programare service nouă</li>
                <li>Selectare piese consumate din inventar</li>
                <li>Calcul cost total reparație</li>
                <li>Data următorului service programat</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
