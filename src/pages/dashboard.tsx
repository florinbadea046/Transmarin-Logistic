// ──────────────────────────────────────────────────────────
// Pagină principală — Dashboard general Transmarin
// TODO: Studenții vor adăuga KPI-uri, grafice, alerte aici
// ──────────────────────────────────────────────────────────

import { Truck, Users, Receipt, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

export default function DashboardPage() {
  // TODO: Calculați aceste valori din localStorage
  const stats = [
    {
      title: "Comenzi Active",
      value: "12",
      icon: Truck,
      description: "3 în tranzit",
    },
    { title: "Angajați", value: "24", icon: Users, description: "21 activi" },
    {
      title: "Facturi Luna",
      value: "45",
      icon: Receipt,
      description: "8 neachitate",
    },
    {
      title: "Km Luna Aceasta",
      value: "18.450",
      icon: BarChart3,
      description: "+12% vs luna trecută",
    },
  ];

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </Header>
      <Main>
        {/* Alerte — studenții vor implementa verificarea expirărilor */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              TODO: Aici vor apărea alertele (ITP, RCA, documente expirate)
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder grafice */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Km parcurși / lună</CardTitle>
            </CardHeader>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              {/* TODO: Adăugați grafic Recharts aici */}
              <p>TODO: Grafic Recharts — km/lună</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Costuri vs. Venituri</CardTitle>
            </CardHeader>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              {/* TODO: Adăugați grafic Recharts aici */}
              <p>TODO: Grafic Recharts — costuri/venituri</p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
