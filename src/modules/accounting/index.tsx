// ──────────────────────────────────────────────────────────
// MODUL: Contabilitate Simplificată — Pagina principală
//
// Acest modul conține:
//   - /accounting             → Prezentare generală
//   - /accounting/invoices    → Facturi intrare/ieșire
//   - /accounting/suppliers   → Gestiune furnizori
//
// TODO pentru studenți:
//   1. CRUD facturi (intrare + ieșire)
//   2. Gestiune furnizori
//   3. Căutare & filtrare facturi
//   4. Simulare atașament fișier
//   5. Export CSV/Excel
//   6. Sold & cash flow
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";

const topNavLinks = [
  { title: "Facturi", href: "/accounting/invoices", isActive: false },
  { title: "Furnizori", href: "/accounting/suppliers", isActive: false },
];

export default function AccountingPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/accounting/invoices" && pathname === "/accounting"),
  }));

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Contabilitate Simplificată</h1>
          <p className="text-muted-foreground">
            Facturi, furnizori, sold și cash flow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Facturi Neachitate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Total de plătit
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sold Curent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Venituri - Cheltuieli
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Furnizori Activi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">
                TODO: Nr furnizori
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ultimele Facturi</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel cu ultimele facturi emise/primite
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
