// ──────────────────────────────────────────────────────────
// MODUL: Resurse Umane — Pagina principală
//
// Acest modul conține:
//   - /hr                 → Prezentare generală angajați
//   - /hr/employees       → Lista angajați + documente
//   - /hr/leaves          → Gestiune concedii
//   - /hr/payroll         → Calcul diurnă/bonus/amendă/ore supl.
//
// TODO pentru studenți:
//   1. CRUD angajați cu documente atașate
//   2. Alerte expirare documente (permis, tahograf, ADR, medical)
//   3. Gestiune concedii (cereri, aprobare, calendar)
//   4. Calcul diurnă, bonusuri, amenzi, ore suplimentare
//   5. Rapoarte lunare per angajat
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";

const topNavLinks = [
  { title: "Angajați", href: "/hr/employees", isActive: false },
  { title: "Concedii", href: "/hr/leaves", isActive: false },
  { title: "Salarizare", href: "/hr/payroll", isActive: false },
];

export default function HRPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/hr/employees" && pathname === "/hr"),
  }));

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Resurse Umane</h1>
          <p className="text-muted-foreground">
            Angajați, concedii, salarizare și documente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Angajați</CardTitle>
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
              <CardTitle>În Concediu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Concedii active azi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Documente Expirate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Alerte documente
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Angajați</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel cu angajații companiei
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
