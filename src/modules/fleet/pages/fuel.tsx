import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FuelPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Evidență Combustibil</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Combustibil vs. Rulaj</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Înregistrare alimentare (litri, cost, km)</li>
                <li>Grafic Recharts: consum/100km per camion</li>
                <li>Comparație consum între camioane</li>
                <li>Alertă consum anormal</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
