import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import type { Trip, Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

export default function CostsPage() {
  const { t } = useTranslation();
  const [filterDriver, setFilterDriver] = React.useState<string>("all");
  const [filterTruck, setFilterTruck] = React.useState<string>("all");
  const [filterPeriod, setFilterPeriod] = React.useState<string>("all");

  const isFiltered =
    filterDriver !== "all" || filterTruck !== "all" || filterPeriod !== "all";

  const resetFilters = () => {
    setFilterDriver("all");
    setFilterTruck("all");
    setFilterPeriod("all");
  };

  const trips = getCollection<Trip>(STORAGE_KEYS.trips);
  const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
  const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);

  const getDriverName = (id: string) =>
    drivers.find((d) => d.id === id)?.name ?? id;
  const getTruckPlate = (id: string) =>
    trucks.find((tr) => tr.id === id)?.plateNumber ?? id;

  const now = new Date();

  const filtered = trips.filter((trip) => {
    if (filterDriver !== "all" && trip.driverId !== filterDriver) return false;
    if (filterTruck !== "all" && trip.truckId !== filterTruck) return false;
    if (filterPeriod !== "all") {
      const dep = new Date(trip.departureDate);
      if (filterPeriod === "thisMonth") {
        if (
          dep.getMonth() !== now.getMonth() ||
          dep.getFullYear() !== now.getFullYear()
        )
          return false;
      } else if (filterPeriod === "lastMonth") {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (
          dep.getMonth() !== lm.getMonth() ||
          dep.getFullYear() !== lm.getFullYear()
        )
          return false;
      } else if (filterPeriod === "last3Months") {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        if (dep < cutoff) return false;
      }
    }
    return true;
  });

  const totalFuelCost = filtered.reduce((s, tr) => s + (tr.fuelCost ?? 0), 0);
  const totalKm = filtered.reduce(
    (s, tr) => s + (tr.kmLoaded ?? 0) + (tr.kmEmpty ?? 0),
    0,
  );
  const costPerKm = totalKm > 0 ? totalFuelCost / totalKm : 0;
  const totalProfit = filtered.reduce(
    (s, tr) => s + ((tr.revenue ?? 0) - (tr.fuelCost ?? 0)),
    0,
  );

  const finishedTrips = filtered.filter((tr) => tr.status === "finalizata");

  const last6MonthsKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6MonthsKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const monthlyMap: Record<string, { revenue: number; fuelCost: number }> = {};
  for (const key of last6MonthsKeys) {
    monthlyMap[key] = { revenue: 0, fuelCost: 0 };
  }
  for (const trip of filtered) {
    const d = new Date(trip.departureDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].revenue += trip.revenue ?? 0;
      monthlyMap[key].fuelCost += trip.fuelCost ?? 0;
    }
  }

  const chartData = last6MonthsKeys.map((key) => {
    const vals = monthlyMap[key];
    return {
      month: key,
      profit: vals.revenue - vals.fuelCost,
      revenue: vals.revenue,
      fuelCost: vals.fuelCost,
    };
  });

  const driverProfitMap: Record<string, { name: string; profit: number }> = {};
  for (const trip of filtered) {
    if (!driverProfitMap[trip.driverId]) {
      driverProfitMap[trip.driverId] = {
        name: getDriverName(trip.driverId),
        profit: 0,
      };
    }
    driverProfitMap[trip.driverId].profit +=
      (trip.revenue ?? 0) - (trip.fuelCost ?? 0);
  }
  const driverChartData = Object.values(driverProfitMap).sort(
    (a, b) => b.profit - a.profit,
  );

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{t("costs.title")}</h1>
        </div>
      </Header>

      <Main>
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("costs.filters.driver")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("costs.filters.allDrivers")}
              </SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTruck} onValueChange={setFilterTruck}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("costs.filters.truck")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("costs.filters.allTrucks")}
              </SelectItem>
              {trucks.map((tr) => (
                <SelectItem key={tr.id} value={tr.id}>
                  {tr.plateNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("costs.filters.period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("costs.filters.allTime")}</SelectItem>
              <SelectItem value="thisMonth">
                {t("costs.filters.thisMonth")}
              </SelectItem>
              <SelectItem value="lastMonth">
                {t("costs.filters.lastMonth")}
              </SelectItem>
              <SelectItem value="last3Months">
                {t("costs.filters.last3Months")}
              </SelectItem>
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t("costs.filters.reset")}
            </Button>
          )}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("costs.kpi.totalFuelCost")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalFuelCost.toLocaleString()} RON
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("costs.kpi.costPerKm")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {costPerKm.toFixed(2)} RON/km
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("costs.kpi.totalProfit")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {totalProfit.toLocaleString()} RON
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                {t("costs.chart.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={chartData}
                  margin={{ left: -10, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <ChartTooltip />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name={t("costs.chart.profit")}
                    stroke="#22c55e"
                    fill="#bbf7d0"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                {t("costs.driverChart.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {driverChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {t("costs.driverChart.noData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={driverChartData}
                    layout="vertical"
                    margin={{ left: 0, right: 12, top: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={72}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} RON`,
                        t("costs.driverChart.profit"),
                      ]}
                    />
                    <Bar
                      dataKey="profit"
                      name={t("costs.driverChart.profit")}
                      radius={[0, 4, 4, 0]}
                    >
                      {driverChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("costs.table.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("costs.table.trip")}</TableHead>
                  <TableHead>{t("costs.table.driver")}</TableHead>
                  <TableHead>{t("costs.table.truck")}</TableHead>
                  <TableHead>{t("costs.table.date")}</TableHead>
                  <TableHead className="text-right">
                    {t("costs.table.revenue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("costs.table.fuelCost")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("costs.table.profit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedTrips.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {t("costs.table.noResults")}
                    </TableCell>
                  </TableRow>
                ) : (
                  finishedTrips.map((trip, i) => {
                    const profit = (trip.revenue ?? 0) - (trip.fuelCost ?? 0);
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">#{i + 1}</TableCell>
                        <TableCell>{getDriverName(trip.driverId)}</TableCell>
                        <TableCell>{getTruckPlate(trip.truckId)}</TableCell>
                        <TableCell>{trip.departureDate}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(trip.revenue ?? 0).toLocaleString()} RON
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {trip.fuelCost.toLocaleString()} RON
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={profit >= 0 ? "default" : "destructive"}
                          >
                            {profit.toLocaleString()} RON
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
