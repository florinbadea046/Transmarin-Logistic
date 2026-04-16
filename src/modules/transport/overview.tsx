// ──────────────────────────────────────────────────────────
// MODUL: Transport & Dispecerat — Pagina principală
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Driver, Truck } from "@/modules/transport/types";

type RawTrip = {
  id: string; orderId: string; driverId: string; truckId: string;
  date?: string; departureDate?: string;
  kmLoaded: number; kmEmpty: number; fuelCost: number; status: string;
  loadedKm?: number; emptyKm?: number;
};

export default function TransportPage() {
  const { t } = useTranslation();

  const topNavLinks = [
    { title: t("transportOverview.nav.orders"), href: "/transport/orders", isActive: false },
    { title: t("transportOverview.nav.trips"), href: "/transport/trips", isActive: false },
    { title: t("transportOverview.nav.drivers"), href: "/transport/drivers", isActive: false },
  ];

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive: link.href === "/transport/orders",
  }));

  const [activeOrders, setActiveOrders] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [monthlyKm, setMonthlyKm] = useState(0);
  const [availableDrivers, setAvailableDrivers] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; km: number; key: string }[]>([]);
  const [expiringDrivers, setExpiringDrivers] = useState<Driver[]>([]);
  const [expiringTrucks, setExpiringTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    const calculateKPIs = () => {
      try {
        const orders = getCollection<Order>(STORAGE_KEYS.orders);
        const trips = getCollection<RawTrip>(STORAGE_KEYS.trips);
        const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);

        const activeCount = orders.filter(
          (o) => o.status === "pending" || o.status === "assigned" || o.status === "in_transit"
        ).length;
        setActiveOrders(activeCount);

        const today = new Date().toISOString().split("T")[0];
        const todayCount = trips.filter((trip) => {
          const d = trip.departureDate || trip.date || "";
          return d.slice(0, 10) === today;
        }).length;
        setTodayTrips(todayCount);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalKm = trips
          .filter((trip) => {
            const d = new Date(trip.departureDate || trip.date || "");
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((total, trip) => {
            const loaded = trip.kmLoaded || trip.loadedKm || 0;
            const empty = trip.kmEmpty || trip.emptyKm || 0;
            return total + loaded + empty;
          }, 0);
        setMonthlyKm(Math.round(totalKm));

        const availableCount = drivers.filter(
          (d) => d.status === "available"
        ).length;
        setAvailableDrivers(availableCount);
      } catch {
        // silently ignore localStorage parse errors
      }
    };

    const calculateLast6MonthsKm = () => {
      const trips = getCollection<RawTrip>(STORAGE_KEYS.trips);
      const now = new Date();
      const months = [...Array(6)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: d.toLocaleString("ro-RO", { month: "short" }),
          km: 0,
          key: `${d.getFullYear()}-${d.getMonth()}`,
        };
      });
      trips.forEach((trip) => {
        const d = new Date(trip.departureDate || trip.date || "");
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((m) => m.key === key);
        if (m) {
          const loaded = trip.kmLoaded || trip.loadedKm || 0;
          const empty = trip.kmEmpty || trip.emptyKm || 0;
          m.km += loaded + empty;
        }
      });
      setChartData(months);
    };

    const checkExpiringDocs = () => {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
      const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);

      setExpiringDrivers(
        drivers.filter((d) => {
          if (!d.licenseExpiry) return false;
          return new Date(d.licenseExpiry) <= in30Days;
        })
      );
      setExpiringTrucks(
        trucks.filter((truck) => {
          const fields = [truck.itpExpiry, truck.rcaExpiry, truck.vignetteExpiry];
          return fields.some((f) => {
            if (!f) return false;
            return new Date(f) <= in30Days;
          });
        })
      );
    };

    calculateKPIs();
    calculateLast6MonthsKm();
    checkExpiringDocs();

    const interval = setInterval(calculateKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{t("transportOverview.title")}</h1>
          <p className="text-muted-foreground">{t("transportOverview.subtitle")}</p>
        </div>

        {(expiringDrivers.length > 0 || expiringTrucks.length > 0) && (
          <Card className="mb-6 border-l-4 border-red-500 dark:border-red-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400">
                {t("transportOverview.expiredDocs")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-red-700 dark:text-red-400">
              {expiringDrivers.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("transportOverview.expiredDrivers")}</h3>
                  <ul className="list-disc ml-5">
                    {expiringDrivers.map((d) => (
                      <li key={d.id}>
                        {d.name} — {t("transportOverview.expiresOn")}{" "}
                        {new Date(d.licenseExpiry).toLocaleDateString("ro-RO")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringTrucks.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("transportOverview.expiredTrucks")}</h3>
                  <ul className="list-disc ml-5">
                    {expiringTrucks.map((truck) => {
                      const exp = truck.itpExpiry || truck.rcaExpiry || truck.vignetteExpiry;
                      return (
                        <li key={truck.id}>
                          {truck.plateNumber} — {t("transportOverview.expiresOn")}{" "}
                          {exp ? new Date(exp).toLocaleDateString("ro-RO") : "—"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>{t("transportOverview.kpiOrders")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">{t("transportOverview.kpiLabelOrders")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("transportOverview.kpiTrips")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTrips}</p>
              <p className="text-sm text-muted-foreground">{t("transportOverview.kpiLabelTrips")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("transportOverview.kpiKm")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{monthlyKm.toLocaleString("ro-RO")}</p>
              <p className="text-sm text-muted-foreground">{t("transportOverview.kpiCurrentMonth")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("transportOverview.kpiDrivers")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{availableDrivers}</p>
              <p className="text-sm text-muted-foreground">{t("transportOverview.kpiAvailable")}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("transportOverview.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border rounded-md text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground uppercase text-xs">
                      {t("transportOverview.chartMonth")}
                    </th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground uppercase text-xs">
                      {t("transportOverview.chartKm")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item) => (
                    <tr key={item.key} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2">
                        {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {item.km.toLocaleString("ro-RO")} km
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
