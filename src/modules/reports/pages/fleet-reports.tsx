import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FleetReportsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Parc Auto</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Rapoarte Parc Auto</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Cost mentenanță per camion</li>
                <li>Consum combustibil per camion</li>
                <li>Piese consumate per perioadă</li>
                <li>Grafice comparative</li>
                <li>Export PDF / Excel</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
