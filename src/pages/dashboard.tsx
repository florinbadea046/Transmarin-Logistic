import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, Receipt, BarChart3, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatCurrency } from "@/utils/format";

import {
  padTwo,
  getTripDate,
  buildLast30Days,
} from "./_components/dashboard-utils";
import { useTransportData, useHRData } from "./_components/dashboard-hooks";
import { AlerteTransport } from "./_components/dashboard-transport-alerts";
import { HRSection } from "./_components/dashboard-hr-section";
import { FinancialSection } from "./_components/dashboard-financial-section";
import { useFinancialData } from "./_components/dashboard-hooks";
import { TransportMainSection } from "./_components/dashboard-transport-main-section";
import type { Invoice } from "@/modules/accounting/types";

const COSTS_VS_REVENUE_MONTHS = 6;

function buildCostsVsRevenue(invoices: Invoice[], months: string[], now: Date) {
  const buckets = Array.from({ length: COSTS_VS_REVENUE_MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (COSTS_VS_REVENUE_MONTHS - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}`,
      label: `${months[d.getMonth()] ?? ""} ${String(d.getFullYear()).slice(2)}`,
      revenue: 0,
      costs: 0,
    };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const inv of invoices) {
    const key = (inv.date ?? "").slice(0, 7);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    if (inv.type === "income") bucket.revenue += inv.total ?? 0;
    else if (inv.type === "expense") bucket.costs += inv.total ?? 0;
  }
  return buckets;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { orders, trips, trucks, maintenance, fuelLogs } = useTransportData();
  const { employees, leaveRequests } = useHRData();
  const { invoices } = useFinancialData();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;

  const activeOrders = orders.filter(
    (o) =>
      o.status === "pending" ||
      o.status === "assigned" ||
      o.status === "in_transit",
  ).length;

  const kmMonth = trips
    .filter((trip) => getTripDate(trip).startsWith(thisMonth))
    .reduce((sum, trip) => sum + (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0), 0);

  const months = t("dashboard.months", { returnObjects: true }) as string[];
  function shortLabel(ymd: string): string {
    const parts = ymd.split("-");
    if (parts.length < 3) return ymd;
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
  }

  const days30 = buildLast30Days();
  const kmByDay: Record<string, number> = {};
  for (const d of days30) kmByDay[d] = 0;
  for (const trip of trips) {
    const key = getTripDate(trip).slice(0, 10);
    if (key in kmByDay)
      kmByDay[key] += (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0);
  }
  const chartData = days30.map((d) => ({
    date: shortLabel(d),
    km: kmByDay[d],
  }));

  // Numere dinamice pentru KPI descriptions
  const activeEmployeesCount = employees.length;
  const unpaidInvoicesCount = (invoices as Invoice[]).filter(
    (inv) => inv.status === "sent" || inv.status === "overdue",
  ).length;
  const invoicesThisMonthCount = (invoices as Invoice[]).filter(
    (inv) => (inv.date ?? "").startsWith(thisMonth),
  ).length;

  const costsVsRevenueData = useMemo(
    () => buildCostsVsRevenue(invoices as Invoice[], months, today).map((b) => ({
      label: b.label,
      [t("dashboard.charts.revenue")]: Math.round(b.revenue),
      [t("dashboard.charts.costs")]: Math.round(b.costs),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, months, t],
  );
  const hasCostsVsRevenueData = costsVsRevenueData.some(
    (d) => (d[t("dashboard.charts.revenue")] as number) > 0 || (d[t("dashboard.charts.costs")] as number) > 0,
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("dashboard.title")}</h1>
      </Header>
      <Main>
        <div className="space-y-8">
          <AlerteTransport trucks={trucks} />

          {/* Sectiunea Transport originala — NEATINSA */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("dashboard.cards.activeOrders")}
                  </CardTitle>
                  <PackageCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.activeOrdersDesc")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("dashboard.cards.employees")}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeEmployeesCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.employeesDesc", { count: activeEmployeesCount })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("dashboard.cards.invoices")}
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoicesThisMonthCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.invoicesDesc", { count: unpaidInvoicesCount })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("dashboard.cards.kmMonth")}
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {kmMonth.toLocaleString()} km
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.kmMonthDesc")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("dashboard.charts.kmPerDay")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval={6}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <ChartTooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(v) => [
                          `${v ?? 0} km`,
                          t("dashboard.charts.kmTooltip"),
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="km"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("dashboard.charts.costsVsRevenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  {!hasCostsVsRevenueData ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                      {t("reportsDashboard.noData")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220} minWidth={0}>
                      <BarChart
                        data={costsVsRevenueData}
                        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                          tickFormatter={(v) =>
                            new Intl.NumberFormat("ro-RO", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(Number(v))
                          }
                        />
                        <ChartTooltip
                          contentStyle={{ fontSize: 12 }}
                          formatter={(v) =>
                            typeof v === "number" ? formatCurrency(v) : String(v ?? "")
                          }
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey={t("dashboard.charts.revenue")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={t("dashboard.charts.costs")} fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* A40: Dashboard Principal — Sectiunea Transport */}
          <TransportMainSection
            orders={orders}
            trips={trips}
            trucks={trucks}
            maintenance={maintenance}
            fuelLogs={fuelLogs}
          />

          <Separator />
          <Separator />

          {/* D16: Sectiunea Financiar */}
          <FinancialSection invoices={invoices} />

          <Separator />
          {/* Sectiunea HR — NEATINSA */}
          <HRSection employees={employees} leaveRequests={leaveRequests} />
        </div>
      </Main>
    </>
  );
}
