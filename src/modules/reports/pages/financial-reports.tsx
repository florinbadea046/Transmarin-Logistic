import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancialReportsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Financiare</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Rapoarte Financiare</CardTitle>
          </CardHeader>
          <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">TODO: Implementați aici</p>
              <ul className="text-sm text-left list-disc pl-4 space-y-1">
                <li>Sold total, venituri, cheltuieli</li>
                <li>Cash flow lunar</li>
                <li>Comparație lună curentă vs precedentă</li>
                <li>Grafice Recharts</li>
                <li>Export PDF / Excel</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
