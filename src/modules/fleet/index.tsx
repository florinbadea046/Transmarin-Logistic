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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Camioane în Flotă</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Din localStorage
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Piese sub Stoc Minim</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Alertă stoc scăzut
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Service Programat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Următoarea revizie
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Parc Auto</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel cu toate camioanele, status, km, expirări
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
