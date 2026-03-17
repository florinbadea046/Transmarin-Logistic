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

  const [activeOrders, setActiveOrders] = useState<number>(0);
  const [todayTrips, setTodayTrips] = useState<number>(0);
  const [monthlyKm, setMonthlyKm] = useState<number>(0);
  const [availableDrivers, setAvailableDrivers] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expiringDrivers, setExpiringDrivers] = useState<any[]>([]);
  const [expiringTrucks, setExpiringTrucks] = useState<any[]>([]);

  useEffect(() => {
    const calculateKPIs = () => {
      try {
        const orders = JSON.parse(localStorage.getItem("transport_orders") || "[]");
        const activeCount = orders.filter(
          (order: any) =>
            order.status === "active" ||
            order.status === "in_progress" ||
            order.status === "pending"
        ).length;
        setActiveOrders(activeCount);

        const trips = JSON.parse(localStorage.getItem("transport_trips") || "[]");
        const today = new Date().toISOString().split("T")[0];
        const todayCount = trips.filter((trip: any) => {
          const tripDate = new Date(trip.date);
          return tripDate.toISOString().split("T")[0] === today;
        }).length;
        setTodayTrips(todayCount);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalKm = trips
          .filter((trip: any) => {
            const d = new Date(trip.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum: number, t: any) => {
            const loaded = parseFloat(t.loadedKm || 0);
            const empty = parseFloat(t.emptyKm || 0);
            return sum + loaded + empty;
          }, 0);

        setMonthlyKm(Math.round(totalKm));

        const drivers = JSON.parse(localStorage.getItem("transport_drivers") || "[]");
        const availableCount = drivers.filter(
          (d: any) => d.status === "available" || d.available === true
        ).length;
        setAvailableDrivers(availableCount);
      } catch (error) {
        console.error("Eroare KPI:", error);
        setActiveOrders(0);
        setTodayTrips(0);
        setMonthlyKm(0);
        setAvailableDrivers(0);
      }
    };

    const initializeMockData = () => {
      if (!localStorage.getItem("transport_orders")) {
        localStorage.setItem(
          "transport_orders",
          JSON.stringify([
            { id: "1", status: "active" },
            { id: "2", status: "in_progress" },
            { id: "3", status: "completed" },
          ])
        );
      }

      if (!localStorage.getItem("transport_trips")) {
        const today = new Date();
        const trips = [];
        for (let i = 0; i < 20; i++) {
          const d = new Date();
          d.setMonth(today.getMonth() - Math.floor(Math.random() * 6));
          trips.push({
            id: i + 1,
            date: d.toISOString(),
            loadedKm: Math.floor(Math.random() * 400),
            emptyKm: Math.floor(Math.random() * 120),
          });
        }
        localStorage.setItem("transport_trips", JSON.stringify(trips));
      }

      if (!localStorage.getItem("transport_drivers")) {
        localStorage.setItem(
          "transport_drivers",
          JSON.stringify([
            { id: "1", name: "Ion Popescu", status: "available" },
            { id: "2", name: "Andrei Ionescu", status: "busy" },
            { id: "3", name: "Mihai Radu", status: "available" },
          ])
        );
      }
    };

    const calculateLast6MonthsKm = () => {
      const trips = JSON.parse(localStorage.getItem("transport_trips") || "[]");
      const now = new Date();
      const months = [...Array(6)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: d.toLocaleString("ro-RO", { month: "short" }),
          year: d.getFullYear(),
          month: d.getMonth(),
          key: `${d.getFullYear()}-${d.getMonth()}`,
          km: 0,
        };
      });

      trips.forEach((trip: any) => {
        const d = new Date(trip.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((m) => m.key === key);
        if (m) {
          const loaded = parseFloat(trip.loadedKm || 0);
          const empty = parseFloat(trip.emptyKm || 0);
          m.km += loaded + empty;
        }
      });

      setChartData(months);
    };

    const checkExpiringDocs = () => {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      const drivers = JSON.parse(localStorage.getItem("transport_drivers") || "[]");
      const expiringD = drivers.filter((driver: any) => {
        if (!driver.licenseExpiry) return false;
        const exp = new Date(driver.licenseExpiry);
        return exp <= in30Days;
      });
      setExpiringDrivers(expiringD);

      const trucks = JSON.parse(localStorage.getItem("transport_trucks") || "[]");
      const expiringT = trucks.filter((truck: any) => {
        const fields = ["itpExpiry", "rcaExpiry", "vignetteExpiry"];
        return fields.some((field) => {
          if (!truck[field]) return false;
          const exp = new Date(truck[field]);
          return exp <= in30Days;
        });
      });
      setExpiringTrucks(expiringT);
    };

    const initializeMockDocs = () => {
      const today = new Date();
      const soon = new Date();
      soon.setDate(today.getDate() + 10);
      const expired = new Date();
      expired.setDate(today.getDate() - 5);

      if (!localStorage.getItem("transport_drivers")) {
        localStorage.setItem(
          "transport_drivers",
          JSON.stringify([
            { id: 1, name: "Ion Popescu", licenseExpiry: soon.toISOString() },
            { id: 2, name: "Andrei Ionescu", licenseExpiry: expired.toISOString() },
            { id: 3, name: "Mihai Radu", licenseExpiry: "2030-01-01" },
          ])
        );
      }

      if (!localStorage.getItem("transport_trucks")) {
        localStorage.setItem(
          "transport_trucks",
          JSON.stringify([
            { id: 1, plate: "B-123-XYZ", itpExpiry: soon.toISOString() },
            { id: 2, plate: "B-999-AAA", rcaExpiry: expired.toISOString() },
            { id: 3, plate: "CT-543-BBB", vignetteExpiry: "2030-01-01" },
          ])
        );
      }
    };

    initializeMockData();
    initializeMockDocs();
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Transport & Dispecerat</h1>
          <p className="text-muted-foreground">
            Gestionează comenzile, cursele și asocierea șofer-camion.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Comenzi Active</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">Comenzi în desfășurare</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Curse Azi</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTrips}</p>
              <p className="text-sm text-muted-foreground">Livrări azi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Km Total Luna</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{monthlyKm.toLocaleString("ro-RO")}</p>
              <p className="text-sm text-muted-foreground">
                Km parcurși în {new Date().toLocaleDateString("ro-RO", { month: "long" })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Șoferi Disponibili</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{availableDrivers}</p>
              <p className="text-sm text-muted-foreground">Gata de curse</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Km parcurși în ultimele 6 luni</CardTitle></CardHeader>
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

        {(expiringDrivers.length > 0 || expiringTrucks.length > 0) && (
          <Card className="mt-6 border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">
                ⚠️ Documente expirate / care expiră în ≤ 30 zile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expiringDrivers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-700">Șoferi</h3>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {expiringDrivers.map((d) => (
                      <li key={d.id}>
                        {d.name} — expiră la{" "}
                        {new Date(d.licenseExpiry).toLocaleDateString("ro-RO")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringTrucks.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-700">Camioane</h3>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {expiringTrucks.map((t) => {
                      const expiry = t.itpExpiry || t.rcaExpiry || t.vignetteExpiry;
                      return (
                        <li key={t.id}>
                          {t.plate} — expiră la{" "}
                          {new Date(expiry).toLocaleDateString("ro-RO")}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader><CardTitle>Lista Comenzi</CardTitle></CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel colegilor — import CSV, filtrare, sortare
          </CardContent>
        </Card>
      </Main>
    </>
  );
}