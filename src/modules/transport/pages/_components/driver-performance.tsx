import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Driver, Trip } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";

const STATUS_COLORS: Record<Trip["status"], string> = {
  planned: "#3b82f6",
  in_desfasurare: "#f59e0b",
  finalizata: "#22c55e",
  anulata: "#ef4444",
};

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

export default function DriverPerformancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [allTrips, setAllTrips] = React.useState<Trip[]>([]);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>("all");

  React.useEffect(() => {
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setAllTrips(getCollection<Trip>(STORAGE_KEYS.trips));
  }, []);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) ?? null;

  const driverTrips = React.useMemo(
    () =>
      selectedDriverId === "all"
        ? allTrips
        : allTrips.filter((tr) => tr.driverId === selectedDriverId),
    [allTrips, selectedDriverId],
  );

  const finalizate = driverTrips.filter((tr) => tr.status === "finalizata");
  const totalKm = driverTrips.reduce(
    (s, tr) => s + tr.kmLoaded + tr.kmEmpty,
    0,
  );
  const totalFuelCost = driverTrips.reduce(
    (s, tr) => s + (tr.fuelCost ?? 0),
    0,
  );
  const totalProfit = driverTrips.reduce(
    (s, tr) => s + ((tr.revenue ?? 0) - (tr.fuelCost ?? 0)),
    0,
  );
  const rataFinalizare =
    driverTrips.length > 0
      ? Math.round((finalizate.length / driverTrips.length) * 100)
      : 0;

  const last6Keys = getLast6MonthKeys();

  const kmPerMonth = React.useMemo(() => {
    const map: Record<string, number> = {};
    last6Keys.forEach((k) => {
      map[k] = 0;
    });
    driverTrips.forEach((tr) => {
      const key = tr.departureDate.slice(0, 7);
      if (map[key] !== undefined) map[key] += tr.kmLoaded + tr.kmEmpty;
    });
    return last6Keys.map((key) => ({
      luna: format(parseISO(`${key}-01`), "MMM yy", { locale: ro }),
      km: map[key],
    }));
  }, [driverTrips, last6Keys]);

  const statusDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    driverTrips.forEach((tr) => {
      counts[tr.status] = (counts[tr.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: t(`trips.status.${status}`),
      value: count,
      color: STATUS_COLORS[status as Trip["status"]] ?? "#94a3b8",
    }));
  }, [driverTrips, t]);

  const driverKmRanking = React.useMemo(() => {
    return drivers
      .map((d) => {
        const trips = allTrips.filter((tr) => tr.driverId === d.id);
        const profit = trips.reduce(
          (s, tr) => s + ((tr.revenue ?? 0) - (tr.fuelCost ?? 0)),
          0,
        );
        return { name: d.name, profit };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [drivers, allTrips]);

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const title = selectedDriver
      ? `${t("driverPerformance.pdf.reportFor")} ${selectedDriver.name}`
      : t("driverPerformance.pdf.reportAll");

    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.text(
      `${t("driverPerformance.pdf.generated")}: ${new Date().toLocaleDateString("ro-RO")}`,
      14,
      26,
    );

    autoTable(doc, {
      startY: 32,
      head: [
        [
          t("driverPerformance.kpi.totalTrips"),
          t("driverPerformance.kpi.finalized"),
          t("driverPerformance.kpi.totalKm"),
          t("driverPerformance.kpi.totalFuelCost"),
          t("driverPerformance.kpi.totalProfit"),
          t("driverPerformance.kpi.finishRate"),
        ],
      ],
      body: [
        [
          driverTrips.length,
          finalizate.length,
          `${totalKm.toLocaleString("ro-RO")} km`,
          `${totalFuelCost.toLocaleString("ro-RO")} RON`,
          `${totalProfit.toLocaleString("ro-RO")} RON`,
          `${rataFinalizare}%`,
        ],
      ],
      styles: { fontSize: 9 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: finalY,
      head: [
        [
          t("driverPerformance.ranking.driver"),
          t("driverPerformance.ranking.profit"),
        ],
      ],
      body: driverKmRanking.map((row) => [
        row.name,
        `${row.profit.toLocaleString("ro-RO")} RON`,
      ]),
      styles: { fontSize: 9 },
    });

    doc.save(`${t("driverPerformance.pdf.filename")}.pdf`);
  };

  const kpiCards = [
    {
      label: t("driverPerformance.kpi.totalTrips"),
      value: driverTrips.length,
    },
    {
      label: t("driverPerformance.kpi.finalized"),
      value: finalizate.length,
    },
    {
      label: t("driverPerformance.kpi.totalKm"),
      value: `${totalKm.toLocaleString("ro-RO")} km`,
    },
    {
      label: t("driverPerformance.kpi.totalFuelCost"),
      value: `${totalFuelCost.toLocaleString("ro-RO")} RON`,
    },
    {
      label: t("driverPerformance.kpi.totalProfit"),
      value: `${totalProfit.toLocaleString("ro-RO")} RON`,
      colored: true,
      positive: totalProfit >= 0,
    },
    {
      label: t("driverPerformance.kpi.finishRate"),
      value: `${rataFinalizare}%`,
    },
  ];

  return (
    <>
      <Header fixed>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-semibold sm:text-lg">
            {t("driverPerformance.title")}
          </h1>
        </div>
      </Header>

      <Main>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("driverPerformance.selectDriver")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("driverPerformance.allDrivers")}
              </SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            {t("driverPerformance.exportPdf")}
          </Button>
        </div>

        {selectedDriver && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("driverPerformance.showing")}:
            </span>
            <Badge variant="secondary">{selectedDriver.name}</Badge>
          </div>
        )}

        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map(({ label, value, colored, positive }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground leading-tight">
                  {label}
                </p>
                <p
                  className={`text-lg font-bold mt-1 ${
                    colored
                      ? positive
                        ? "text-green-600"
                        : "text-red-600"
                      : ""
                  }`}
                >
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t("driverPerformance.charts.kmPerMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={kmPerMonth}
                  margin={{ top: 4, right: 8, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="luna"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={45} />
                  <Tooltip
                    formatter={(val) => [
                      `${(val as number).toLocaleString("ro-RO")} km`,
                      t("driverPerformance.ranking.km"),
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="km"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t("driverPerformance.charts.statusDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {statusDistribution.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {t("driverPerformance.noData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 220}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy={isMobile ? "45%" : "50%"}
                      outerRadius={isMobile ? 75 : 80}
                      label={
                        isMobile
                          ? undefined
                          : ({ name, percent }) =>
                              `${name} ${Math.round((percent ?? 0) * 100)}%`
                      }
                      labelLine={!isMobile}
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [val, ""]} />
                    {isMobile && (
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ fontSize: "11px" }}>{value}</span>
                        )}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("driverPerformance.charts.profitRanking")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driverKmRanking.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                {t("driverPerformance.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={driverKmRanking}
                  margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    formatter={(val) => [
                      `${(val as number).toLocaleString("ro-RO")} RON`,
                      t("driverPerformance.ranking.profit"),
                    ]}
                  />
                  <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("driverPerformance.ranking.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">
                      {t("driverPerformance.ranking.driver")}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {t("driverPerformance.ranking.trips")}
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      {t("driverPerformance.ranking.km")}
                    </th>
                    <th className="pb-2 font-medium text-right">
                      {t("driverPerformance.ranking.profit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drivers
                    .map((d) => {
                      const trips = allTrips.filter(
                        (tr) => tr.driverId === d.id,
                      );
                      const km = trips.reduce(
                        (s, tr) => s + tr.kmLoaded + tr.kmEmpty,
                        0,
                      );
                      const profit = trips.reduce(
                        (s, tr) => s + ((tr.revenue ?? 0) - (tr.fuelCost ?? 0)),
                        0,
                      );
                      return { driver: d, trips: trips.length, km, profit };
                    })
                    .sort((a, b) => b.profit - a.profit)
                    .map(({ driver, trips, km, profit }, idx) => (
                      <tr
                        key={driver.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate({
                            to: "/transport/drivers/$driverId",
                            params: { driverId: driver.id },
                          })
                        }
                      >
                        <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-4 font-medium">{driver.name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {trips}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {km.toLocaleString("ro-RO")} km
                        </td>
                        <td
                          className={`py-2 text-right tabular-nums font-medium ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {profit.toLocaleString("ro-RO")} RON
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
