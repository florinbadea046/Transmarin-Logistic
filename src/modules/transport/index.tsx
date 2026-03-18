// ──────────────────────────────────────────────────────────
// MODUL: Transport & Dispecerat — Pagina principală
//
// Acest modul conține:
//   - /transport           → Lista comenzi + dashboard operațional
//   - /transport/orders    → Gestiune comenzi (import CSV/Excel)
//   - /transport/trips     → Planificare curse zilnice
//   - /transport/drivers   → Asociere șofer ↔ camion
//
// TODO pentru studenți:
//   1. Implementați tabelul cu comenzi (TanStack Table)
//   2. Import comenzi din CSV/Excel (Papaparse / xlsx)
//   3. Planificare curse zilnice cu drag & drop sau formular
//   4. Dashboard operațional cu KPI-uri ✅ COMPLETAT
//   5. Calcul cost per cursă (km gol vs încărcat)
// ──────────────────────────────────────────────────────────
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

const STORAGE_KEYS = {
  ORDERS: "STORAGE_ORDERS",
  TRIPS: "STORAGE_TRIPS",
  DRIVERS: "STORAGE_DRIVERS",
  TRUCKS: "STORAGE_TRUCKS",
};

const topNavLinks = [
  { title: "Comenzi", href: "/transport/orders", isActive: false },
  { title: "Curse", href: "/transport/trips", isActive: false },
  { title: "Șoferi & Camioane", href: "/transport/drivers", isActive: false },
];

export default function TransportPage() {
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive: link.href === "/transport/orders",
  }));

  const [language, setLanguage] = useState<"ro" | "en">("ro");

  const [activeOrders, setActiveOrders] = useState<number>(0);
  const [todayTrips, setTodayTrips] = useState<number>(0);
  const [monthlyKm, setMonthlyKm] = useState<number>(0);
  const [availableDrivers, setAvailableDrivers] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expiringDrivers, setExpiringDrivers] = useState<any[]>([]);
  const [expiringTrucks, setExpiringTrucks] = useState<any[]>([]);

  const t = (key: string) => {
    const texts: Record<string, Record<"ro" | "en", string>> = {
      title: { ro: "Transport & Dispecerat", en: "Transport & Dispatch" },
      subtitle: {
        ro: "Gestionează comenzile, cursele și asocierea șofer-camion.",
        en: "Manage orders, daily trips and driver-truck assignments.",
      },
      kpi_orders: { ro: "Comenzi Active", en: "Active Orders" },
      kpi_trips: { ro: "Curse Azi", en: "Trips Today" },
      kpi_km: { ro: "Km Total Lună", en: "Total Km (Month)" },
      kpi_drivers: { ro: "Șoferi Disponibili", en: "Available Drivers" },
      kpi_label_orders: {
        ro: "Comenzi în desfășurare",
        en: "Ongoing orders",
      },
      kpi_label_trips: {
        ro: "Livrări programate azi",
        en: "Deliveries today",
      },
      expired_docs: {
        ro: "Documente expirate / care expiră în ≤ 30 zile",
        en: "Expired / expiring documents within ≤ 30 days",
      },
      expired_drivers: { ro: "Șoferi", en: "Drivers" },
      expired_trucks: { ro: "Camioane", en: "Trucks" },
    };
    return texts[key]?.[language] || key;
  };

  useEffect(() => {
    const calculateKPIs = () => {
      try {
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || "[]");
        const trips = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
        const drivers = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRIVERS) || "[]");

        const activeCount = orders.filter(
          (o: any) =>
            o.status === "active" || o.status === "in_progress" || o.status === "pending"
        ).length;
        setActiveOrders(activeCount);

        const today = new Date().toISOString().split("T")[0];
        const todayCount = trips.filter((t: any) => {
          const date = new Date(t.date).toISOString().split("T")[0];
          return date === today;
        }).length;
        setTodayTrips(todayCount);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalKm = trips
          .filter((t: any) => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((total: number, t: any) => {
            const loaded = parseFloat(t.loadedKm || 0);
            const empty = parseFloat(t.emptyKm || 0);
            return total + loaded + empty;
          }, 0);
        setMonthlyKm(Math.round(totalKm));

        const availableCount = drivers.filter(
          (d: any) => d.status === "available" || d.available === true
        ).length;
        setAvailableDrivers(availableCount);
      } catch (err) {
        console.error(err);
      }
    };

    const calculateLast6MonthsKm = () => {
      const trips = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
      const now = new Date();
      const months = [...Array(6)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: d.toLocaleString(language === "ro" ? "ro-RO" : "en-US", { month: "short" }),
          km: 0,
          key: `${d.getFullYear()}-${d.getMonth()}`,
        };
      });
      trips.forEach((t: any) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((m) => m.key === key);
        if (m) {
          const loaded = parseFloat(t.loadedKm || 0);
          const empty = parseFloat(t.emptyKm || 0);
          m.km += loaded + empty;
        }
      });
      setChartData(months);
    };

    const checkExpiringDocs = () => {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      const drivers = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRIVERS) || "[]");
      const trucks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRUCKS) || "[]");

      const expD = drivers.filter((d: any) => {
        if (!d.licenseExpiry) return false;
        const exp = new Date(d.licenseExpiry);
        return exp <= in30Days;
      });
      const expT = trucks.filter((t: any) => {
        const fields = ["itpExpiry", "rcaExpiry", "vignetteExpiry"];
        return fields.some((f) => {
          if (!t[f]) return false;
          const exp = new Date(t[f]);
          return exp <= in30Days;
        });
      });

      setExpiringDrivers(expD);
      setExpiringTrucks(expT);
    };

    calculateKPIs();
    calculateLast6MonthsKm();
    checkExpiringDocs();

    const interval = setInterval(calculateKPIs, 30000);
    return () => clearInterval(interval);
  }, [language]);

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === "ro" ? "en" : "ro")}
          >
            {language === "ro" ? "EN" : "RO"}
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {(expiringDrivers.length > 0 || expiringTrucks.length > 0) && (
          <Card className="mb-6 border-l-4 border-red-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-red-700">
                ⚠️ {t("expired_docs")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-red-700">
              {expiringDrivers.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("expired_drivers")}</h3>
                  <ul className="list-disc ml-5">
                    {expiringDrivers.map((d) => (
                      <li key={d.id}>
                        {d.name} — {language === "ro" ? "expiră la" : "expires on"}{" "}
                        {new Date(d.licenseExpiry).toLocaleDateString(
                          language === "ro" ? "ro-RO" : "en-US"
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringTrucks.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("expired_trucks")}</h3>
                  <ul className="list-disc ml-5">
                    {expiringTrucks.map((t) => {
                      const exp = t.itpExpiry || t.rcaExpiry || t.vignetteExpiry;
                      return (
                        <li key={t.id}>
                          {t.plate} —{" "}
                          {language === "ro" ? "expiră la" : "expires on"}{" "}
                          {new Date(exp).toLocaleDateString(
                            language === "ro" ? "ro-RO" : "en-US"
                          )}
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
            <CardHeader><CardTitle>{t("kpi_orders")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">{t("kpi_label_orders")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("kpi_trips")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTrips}</p>
              <p className="text-sm text-muted-foreground">{t("kpi_label_trips")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("kpi_km")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{monthlyKm.toLocaleString(language)}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ro" ? "Luna curentă" : "Current month"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("kpi_drivers")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{availableDrivers}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ro" ? "Disponibili" : "Available"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>{language === "ro" ? "Km parcurși în ultimele 6 luni" : "Km driven in last 6 months"}</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="km" fill="#3b82f6" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}