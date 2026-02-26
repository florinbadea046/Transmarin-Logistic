// ──────────────────────────────────────────────────────────
// MODUL: Contabilitate Simplificată — Pagina principală
// D7: KPI cards — total venituri luna, total cheltuieli luna,
//     sold (venituri-cheltuieli), nr. facturi neplatite
// D8: BarChart venituri vs cheltuieli pe ultimele 6 luni
// ──────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const MONTH_NAMES = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatRON(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(value);
}

// ──────────────────────────────────────────────────────────
// Nav
// ──────────────────────────────────────────────────────────
const topNavLinks = [
  { title: "Facturi", href: "/accounting/invoices", isActive: false },
  { title: "Furnizori", href: "/accounting/suppliers", isActive: false },
];

// ──────────────────────────────────────────────────────────
// Componenta principală
// ──────────────────────────────────────────────────────────
export default function AccountingPage() {
  const { pathname } = useLocation();

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive: pathname === link.href || (link.href === "/accounting/invoices" && pathname === "/accounting"),
  }));

  // ── Citim facturile din localStorage ──
  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── D7: KPI-uri pentru luna curentă ──
  const kpi = useMemo(() => {
    let venitLuna = 0;
    let cheltuieliLuna = 0;
    let facturiNeplatite = 0;

    invoices.forEach((inv) => {
      const d = new Date(inv.date);
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

      if (isCurrentMonth) {
        if (inv.type === "income") venitLuna += inv.total;
        else cheltuieliLuna += inv.total;
      }

      if (inv.status === "sent" || inv.status === "overdue") {
        facturiNeplatite += 1;
      }
    });

    return {
      venitLuna,
      cheltuieliLuna,
      sold: venitLuna - cheltuieliLuna,
      facturiNeplatite,
    };
  }, [invoices, currentMonth, currentYear]);

  // ── D8: Venituri vs cheltuieli pe ultimele 6 luni ──
  const chartData = useMemo(() => {
    // Construim ultimele 6 luni (inclusiv luna curentă)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      return {
        month: d.getMonth(),
        year: d.getFullYear(),
        label: MONTH_NAMES[d.getMonth()],
        venituri: 0,
        cheltuieli: 0,
      };
    });

    invoices.forEach((inv) => {
      const d = new Date(inv.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const bucket = months.find((b) => b.month === m && b.year === y);
      if (!bucket) return;
      if (inv.type === "income") bucket.venituri += inv.total;
      else bucket.cheltuieli += inv.total;
    });

    return months.map(({ label, venituri, cheltuieli }) => ({
      label,
      Venituri: Math.round(venituri),
      Cheltuieli: Math.round(cheltuieli),
    }));
  }, [invoices, currentMonth, currentYear]);

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Contabilitate Simplificată</h1>
          <p className="text-muted-foreground">Facturi, furnizori, sold și cash flow.</p>
        </div>

        {/* ── D7: KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Venituri luna curentă</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatRON(kpi.venitLuna)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Cheltuieli luna curentă</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatRON(kpi.cheltuieliLuna)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Sold (Venituri − Cheltuieli)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.sold >= 0 ? "text-green-600" : "text-red-500"}`}>{formatRON(kpi.sold)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Facturi neplatite</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-500">{kpi.facturiNeplatite}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── D8: BarChart Venituri vs Cheltuieli ── */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Venituri vs Cheltuieli — ultimele 6 luni</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">Nu există facturi înregistrate.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("ro-RO", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(v)
                    }
                  />
                  <Tooltip formatter={(value: number | undefined) => (value !== undefined ? formatRON(value) : "")} />
                  <Legend />
                  <Bar dataKey="Venituri" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cheltuieli" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
