// ──────────────────────────────────────────────────────────
// MODUL: Contabilitate Simplificată — Pagina principală
// ──────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getCollection } from "@/utils/local-storage";
import { formatCurrency } from "@/utils/format";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

function parseDate(dateStr: string): { year: number; month: number } {
  const [yearStr, monthStr] = dateStr.split("-");
  return { year: Number(yearStr), month: Number(monthStr) - 1 };
}

export default function AccountingPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const topNavLinks = [
    { title: t("accounting.nav.invoices"), href: "/accounting/invoices", isActive: false },
    { title: t("accounting.nav.suppliers"), href: "/accounting/suppliers", isActive: false },
  ];

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive: pathname === link.href || (link.href === "/accounting/invoices" && pathname === "/accounting"),
  }));

  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const kpi = useMemo(() => {
    let venitLuna = 0;
    let cheltuieliLuna = 0;
    let facturiNeplatite = 0;

    invoices.forEach((inv) => {
      const { year, month } = parseDate(inv.date);
      const isCurrentMonth = month === currentMonth && year === currentYear;

      if (isCurrentMonth) {
        if (inv.type === "income") venitLuna += inv.total;
        else cheltuieliLuna += inv.total;
      }

      if (inv.status === "sent" || inv.status === "overdue") {
        facturiNeplatite += 1;
      }
    });

    return { venitLuna, cheltuieliLuna, sold: venitLuna - cheltuieliLuna, facturiNeplatite };
  }, [invoices, currentMonth, currentYear]);

  const months = t("dashboard.months", { returnObjects: true }) as string[];

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 5 + i, 1);
      return {
        month: d.getMonth(),
        year: d.getFullYear(),
        label: months[d.getMonth()] ?? d.toLocaleString("ro-RO", { month: "short" }),
        venituri: 0,
        cheltuieli: 0,
      };
    });

    invoices.forEach((inv) => {
      const { year, month } = parseDate(inv.date);
      const bucket = buckets.find((b) => b.month === month && b.year === year);
      if (!bucket) return;
      if (inv.type === "income") bucket.venituri += inv.total;
      else bucket.cheltuieli += inv.total;
    });

    return buckets.map(({ label, venituri, cheltuieli }) => ({
      label,
      [t("accounting.chartRevenue")]: Math.round(venituri),
      [t("accounting.chartExpenses")]: Math.round(cheltuieli),
    }));
  }, [invoices, currentMonth, currentYear, months, t]);

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("accounting.title")}</h1>
          <p className="text-muted-foreground">{t("accounting.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("accounting.revenueMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(kpi.venitLuna)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("accounting.expensesMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(kpi.cheltuieliLuna)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("accounting.balance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.sold >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(kpi.sold)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("accounting.unpaidInvoices")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-500">{kpi.facturiNeplatite}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("accounting.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">{t("accounting.noInvoices")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("ro-RO", { notation: "compact", compactDisplay: "short" }).format(v)
                    }
                  />
                  <Tooltip formatter={(value) => (typeof value === "number" ? formatCurrency(value) : String(value ?? ""))} />
                  <Legend />
                  <Bar dataKey={t("accounting.chartRevenue")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t("accounting.chartExpenses")} fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
