import { useTranslation } from "react-i18next";
import {
  AlertTriangle, PackageCheck, Fuel, TrendingUp, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order, Truck as TruckType } from "@/modules/transport/types";
import type { MaintenanceRecord } from "@/modules/transport/types";
import type { FuelLog } from "@/modules/transport/types";
import { cn } from "@/lib/utils";
import { padTwo, getTripDate } from "./dashboard-utils";
import type { RawTrip } from "./dashboard-utils";

// ── A42: Transport Section (NOU) ───────────────────────────

export function TransportSection({
  orders, trips, trucks, maintenance, fuelLogs,
}: {
  orders: Order[];
  trips: RawTrip[];
  trucks: TruckType[];
  maintenance: MaintenanceRecord[];
  fuelLogs: FuelLog[];
}) {
  const { t } = useTranslation();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;

  // Card 1: Comenzi Active (live)
  const activeOrders = orders.filter((o) =>
    o.status === "pending" || o.status === "assigned" || o.status === "in_transit",
  ).length;

  // Card 2: Cost Combustibil luna curenta
  const fuelCostMonth = fuelLogs
    .filter((f) => f.date.startsWith(thisMonth))
    .reduce((s, f) => s + f.totalCost, 0);

  // Card 3: Profit Estimat luna curenta
  const profitMonth = trips
    .filter((tr) => getTripDate(tr).startsWith(thisMonth) && tr.status === "finalizata")
    .reduce((s, tr) => s + (tr.revenue ?? 0) - (tr.fuelCost ?? 0), 0);

  // Alerte mentenanta > 7 zile
  const maintenanceAlerts = maintenance
    .filter((m) => m.status === "in_lucru" && !m.exitDate)
    .map((m) => {
      const days = Math.ceil(
        (today.getTime() - new Date(`${m.entryDate}T00:00:00`).getTime()) / 86400000,
      );
      const truck = trucks.find((tr) => tr.id === m.truckId);
      return { m, days, truck };
    })
    .filter((a) => a.days > 7)
    .sort((a, b) => b.days - a.days);

  const cards = [
    {
      title: t("dashboard.transport.activeOrders"),
      value: activeOrders,
      desc: t("dashboard.transport.activeOrdersDesc"),
      icon: <PackageCheck className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: t("dashboard.transport.fuelCostMonth"),
      value: `${fuelCostMonth.toLocaleString("ro-RO")} RON`,
      desc: t("dashboard.transport.fuelCostMonthDesc"),
      icon: <Fuel className="h-4 w-4 text-muted-foreground" />,
    },
    {
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
        <h2 className="text-base font-semibold">{t("dashboard.transport.title")}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ title, value, desc, icon, alert }) => (
          <Card key={title} className={alert ? "border-red-200 dark:border-red-800" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={cn("text-sm font-medium",
                alert ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                {title}
              </CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold",
                alert ? "text-red-600 dark:text-red-400" : "")}>{value}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerte mentenanta */}
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
                <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{truck?.plateNumber ?? m.truckId}</span>
                  <span className="text-muted-foreground truncate">{m.mechanic}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
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
