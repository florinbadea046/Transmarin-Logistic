import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayrollPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Salarizare</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Calcul Salarizare</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Calcul diurnă per angajat/cursă</li>
                <li>Adăugare bonusuri și amenzi</li>
                <li>Ore suplimentare</li>
                <li>Raport lunar per angajat</li>
                <li>Export raport salarizare</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
