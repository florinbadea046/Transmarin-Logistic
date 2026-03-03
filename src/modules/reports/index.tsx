// ──────────────────────────────────────────────────────────
// MODUL: Rapoarte & Dashboard — Pagina principală
//
// Acest modul conține:
//   - /reports             → Dashboard cu KPI-uri și grafice
//   - /reports/transport   → Rapoarte transport
//   - /reports/financial   → Rapoarte financiare
//   - /reports/fleet       → Rapoarte parc auto
//
// TODO pentru studenți:
//   1. KPI-uri calculate din localStorage (km/lună, cost/camion, profit/client)
//   2. Grafice auto-generate cu Recharts
//   3. Filtrare după perioadă, camion, client, rută
//   4. Comparație lună curentă vs. precedentă
//   5. Export rapoarte PDF / Excel (jsPDF / xlsx)
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";

const topNavLinks = [
  { title: "Transport", href: "/reports/transport", isActive: false },
  { title: "Financiar", href: "/reports/financial", isActive: false },
  { title: "Parc Auto", href: "/reports/fleet", isActive: false },
];

export default function ReportsPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/reports/transport" && pathname === "/reports"),
  }));

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Rapoarte & Dashboard</h1>
          <p className="text-muted-foreground">
            KPI-uri, grafice și rapoarte exportabile.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Km / Lună</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-- km</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cost / Camion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-- RON</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profit / Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-- RON</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Curse / Lună</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">--</p>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder grafice */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Km Parcurși (6 luni)</CardTitle>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center text-muted-foreground">
              TODO: Grafic BarChart cu Recharts
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Costuri vs. Venituri</CardTitle>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center text-muted-foreground">
              TODO: Grafic LineChart cu Recharts
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
