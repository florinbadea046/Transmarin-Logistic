// ──────────────────────────────────────────────────────────
// MODUL: Parc Auto & Service — Pagina principală
//
// Acest modul conține:
//   - /fleet              → Prezentare generală parc auto
//   - /fleet/parts        → Inventar piese & consumabile
//   - /fleet/service      → Programări service & istoric reparații
//   - /fleet/fuel         → Evidență combustibil vs. rulaj
//
// TODO pentru studenți:
//   1. Inventar piese cu stoc minim și alertă
//   2. Alocare piese per camion
//   3. Istoric reparații per camion
//   4. Grafic consum combustibil vs km
//   5. Alerte automate ITP, RCA, vignetă
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { TrucksTable } from "@/modules/fleet/components/TrucksTable";
import { TrucksCount } from "@/modules/fleet/components/TrucksCount";
import { LowStockCount } from "@/modules/fleet/components/LowStockCount";
import { ServiceCount } from "@/modules/fleet/components/ServiceCount";
import { ServiceCostMonth } from "@/modules/fleet/components/ServiceCostMonth";
import { FuelCostMonth } from "@/modules/fleet/components/FuelCostMonth";
import { DocExpiryAlerts } from "@/modules/fleet/components/DocExpiryAlerts";

const topNavLinks = [
  { title: "Piese & Consum.", href: "/fleet/parts", isActive: false },
  { title: "Service", href: "/fleet/service", isActive: false },
  { title: "Combustibil", href: "/fleet/fuel", isActive: false },
];

export default function FleetPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/fleet/parts" && pathname === "/fleet"),
  }));

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Parc Auto & Service</h1>
          <p className="text-muted-foreground">
            Gestionează flotă, piese, service și combustibil.
          </p>
        </div>

        {/* KPI Cards — B9 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle>Camioane în Flotă</CardTitle>
            </CardHeader>
            <CardContent>
              <TrucksCount />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Piese sub Stoc Minim</CardTitle>
            </CardHeader>
            <CardContent>
              <LowStockCount />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Service Programat</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceCount />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cost Service Lună</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceCostMonth />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cost Combustibil Lună</CardTitle>
            </CardHeader>
            <CardContent>
              <FuelCostMonth />
            </CardContent>
          </Card>
        </div>

        {/* Alerte ITP / RCA / Vignetă — B11 */}
        <DocExpiryAlerts />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Parc Auto</CardTitle>
          </CardHeader>
          <CardContent>
            <TrucksTable />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
