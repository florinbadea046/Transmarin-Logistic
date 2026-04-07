import { useTranslation } from "react-i18next";
import { Users, Receipt, BarChart3, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
                  <div className="text-2xl font-bold">{employees.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.employeesDesc")}
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
                  <div className="text-2xl font-bold">
                    {
                      orders.filter(
                        (o) =>
                          o.status !== "delivered" && o.status !== "cancelled",
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.cards.invoicesDesc")}
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
                      <Tooltip
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
                  <CardTitle>{t("dashboard.charts.costsVsRevenue")}</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[220px] items-center justify-center text-muted-foreground">
                  <p>{t("dashboard.charts.costsVsRevenueTodo")}</p>
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
