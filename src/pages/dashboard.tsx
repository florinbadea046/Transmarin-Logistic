import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Receipt,
  BarChart3,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Truck as TruckType } from "@/modules/transport/types";

type RawTrip = {
  id: string;
  orderId: string;
  driverId: string;
  truckId: string;
  date?: string;
  departureDate?: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  status: string;
};

function getTripDate(t: RawTrip): string {
  return t.departureDate || t.date || "";
}

function padTwo(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function buildLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i,
    );
    days.push(toYMD(d));
  }
  return days;
}

function useTransportData() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [trips, setTrips] = React.useState<RawTrip[]>([]);
  const [trucks, setTrucks] = React.useState<TruckType[]>([]);

  React.useEffect(() => {
    try {
      setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    } catch (_e) {
      void _e;
    }
    try {
      setTrips(getCollection<RawTrip>(STORAGE_KEYS.trips));
    } catch (_e) {
      void _e;
    }
    try {
      setTrucks(getCollection<TruckType>(STORAGE_KEYS.trucks));
    } catch (_e) {
      void _e;
    }
  }, []);

  return { orders, trips, trucks };
}

function AlerteTransport({ trucks }: { trucks: TruckType[] }) {
  const { t } = useTranslation();
  const nowMs = new Date().getTime();
  const alerts: { label: string; daysLeft: number }[] = [];

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
          alerts.push({
            label: `${truck.plateNumber} — ${type} ${status}`,
            daysLeft,
          });
        }
      } catch (_e) {
        void _e;
      }
    }
  }
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          {t("dashboard.alerts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className={
                  a.daysLeft < 0
                    ? "h-2 w-2 rounded-full bg-red-500 shrink-0"
                    : a.daysLeft < 7
                      ? "h-2 w-2 rounded-full bg-orange-400 shrink-0"
                      : "h-2 w-2 rounded-full bg-yellow-400 shrink-0"
                }
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
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { orders, trips, trucks } = useTransportData();

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
        <div className="space-y-6">
          <AlerteTransport trucks={trucks} />

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
                <div className="text-2xl font-bold">24</div>
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
                <div className="text-2xl font-bold">45</div>
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
      </Main>
    </>
  );
}
