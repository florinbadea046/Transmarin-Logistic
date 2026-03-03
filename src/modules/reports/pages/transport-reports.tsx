import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransportReportsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Transport</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Rapoarte Transport</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Km parcurși per camion / per perioadă</li>
                <li>Raport km gol vs km încărcat</li>
                <li>Cost per cursă / per client</li>
                <li>Filtrare după camion, client, rută, perioadă</li>
                <li>Export PDF / Excel</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
