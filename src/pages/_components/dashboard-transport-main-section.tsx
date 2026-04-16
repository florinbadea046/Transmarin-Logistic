import { useTranslation } from "react-i18next";
import {
  PackageCheck,
  MapPin,
  Fuel,
  TrendingUp,
  Truck,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { padTwo, getTripDate, buildLast30Days } from "./dashboard-utils";
import type { RawTrip } from "./dashboard-utils";
import type {
  Order,
  Truck as TruckType,
  MaintenanceRecord,
  FuelLog,
} from "@/modules/transport/types";

export function TransportMainSection({
  orders,
  trips,
  trucks,
  maintenance,
  fuelLogs,
}: {
  orders: Order[];
  trips: RawTrip[];
  trucks: TruckType[];
  maintenance: MaintenanceRecord[];
  fuelLogs: FuelLog[];
}) {
  const { t } = useTranslation();
  const today = new Date();
  const nowMs = today.getTime();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;
  const months = t("dashboard.months", { returnObjects: true }) as string[];

  const activeOrders = orders.filter(
    (o) =>
      o.status === "pending" ||
      o.status === "assigned" ||
      o.status === "in_transit",
  ).length;

  const kmMonth = trips
    .filter(
      (tr) =>
        getTripDate(tr).startsWith(thisMonth) && tr.status === "finalizata",
    )
    .reduce((s, tr) => s + (tr.kmLoaded ?? 0) + (tr.kmEmpty ?? 0), 0);

  const fuelCostMonth = fuelLogs
    .filter((f) => f.date.startsWith(thisMonth))
    .reduce((s, f) => s + f.totalCost, 0);

  const profitMonth = trips
    .filter(
      (tr) =>
        getTripDate(tr).startsWith(thisMonth) && tr.status === "finalizata",
    )
    .reduce((s, tr) => s + (tr.revenue ?? 0) - (tr.fuelCost ?? 0), 0);

  function shortLabel(ymd: string): string {
    const parts = ymd.split("-");
    if (parts.length < 3) return ymd;
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
  }

  const days30 = buildLast30Days();
  const kmByDay: Record<string, number> = {};
  for (const d of days30) kmByDay[d] = 0;
  for (const tr of trips) {
    if (tr.status !== "finalizata") continue;
    const key = getTripDate(tr).slice(0, 10);
    if (key in kmByDay) kmByDay[key] += (tr.kmLoaded ?? 0) + (tr.kmEmpty ?? 0);
  }
  const chartData = days30.map((d) => ({
    date: shortLabel(d),
    km: kmByDay[d],
  }));

  const docAlerts: { label: string; daysLeft: number }[] = [];
  for (const truck of trucks) {
    const checks = [
      { field: truck.itpExpiry, type: "ITP" },
      { field: truck.rcaExpiry, type: "RCA" },
      { field: truck.vignetteExpiry, type: t("trucks.card.vignette") },
    ];
    for (const { field, type } of checks) {
      if (!field) continue;
      try {
        const daysLeft = Math.ceil(
          (new Date(field).getTime() - nowMs) / 86400000,
        );
        if (daysLeft < 30) {
          const status =
            daysLeft < 0
              ? t("dashboard.alerts.expired")
              : t("dashboard.alerts.expiresIn", { days: daysLeft });
          docAlerts.push({
            label: `${truck.plateNumber} — ${type} ${status}`,
            daysLeft,
          });
        }
      } catch (e) {
        console.warn("Failed to parse date:", e);
      }
    }
  }
  docAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

  const maintenanceAlerts = maintenance
    .filter((m) => m.status === "in_lucru" && !m.exitDate)
    .map((m) => {
      const days = Math.ceil(
        (nowMs - new Date(`${m.entryDate}T00:00:00`).getTime()) / 86400000,
      );
      const truck = trucks.find((tr) => tr.id === m.truckId);
      return { m, days, truck };
    })
    .filter((a) => a.days > 7)
    .sort((a, b) => b.days - a.days);

  const cards = [
    {
      key: "activeOrders",
      title: t("dashboard.transport.activeOrders"),
      value: activeOrders,
      desc: t("dashboard.transport.activeOrdersDesc"),
      icon: <PackageCheck className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: "kmMonth",
      title: t("dashboard.cards.kmMonth"),
      value: `${kmMonth.toLocaleString()} km`,
      desc: t("dashboard.cards.kmMonthDesc"),
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: "fuelCost",
      title: t("dashboard.transport.fuelCostMonth"),
      value: `${fuelCostMonth.toLocaleString("ro-RO")} RON`,
      desc: t("dashboard.transport.fuelCostMonthDesc"),
      icon: <Fuel className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: "profit",
      title: t("dashboard.transport.profitMonth"),
      value: `${profitMonth.toLocaleString("ro-RO")} RON`,
      desc: t("dashboard.transport.profitMonthDesc"),
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      alert: profitMonth < 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">
          {t("dashboard.transport.title")}
        </h2>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, title, value, desc, icon, alert }) => (
          <Card
            key={key}
            className={alert ? "border-red-200 dark:border-red-800" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle
                className={cn(
                  "text-xs sm:text-sm font-medium leading-tight",
                  alert
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                {title}
              </CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-xl sm:text-2xl font-bold",
                  alert ? "text-red-600 dark:text-red-400" : "",
                )}
              >
                {value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.charts.kmPerDay")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-1 sm:px-4">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                width={36}
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

      {docAlerts.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              {t("dashboard.alerts.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {docAlerts.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      a.daysLeft < 0
                        ? "bg-red-500"
                        : a.daysLeft < 7
                          ? "bg-orange-400"
                          : "bg-yellow-400",
                    )}
                  />
                  <span
                    className={
                      a.daysLeft < 0
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : ""
                    }
                  >
                    {a.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {maintenanceAlerts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              {t("dashboard.transport.maintenanceAlert")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 max-h-44 overflow-y-auto">
              {maintenanceAlerts.map(({ m, days, truck }) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium">
                    {truck?.plateNumber ?? m.truckId}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {m.mechanic}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] shrink-0 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  >
                    {t("dashboard.transport.maintenanceDays", { days })}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
