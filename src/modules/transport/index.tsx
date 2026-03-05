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

// ──────────────────────────────────────────────────────────
// MODUL: Transport & Dispecerat — Pagina principală
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

const topNavLinks = [
  { title: "Comenzi", href: "/transport/orders", isActive: false },
  { title: "Curse", href: "/transport/trips", isActive: false },
  { title: "Șoferi & Camioane", href: "/transport/drivers", isActive: false },
];

export default function TransportPage() {
  // Nu mai folosim useLocation - setăm manual link-ul activ
  const links = topNavLinks.map(link => ({
    ...link,
    isActive: link.href === "/transport/orders" // Comenzi e pagina default
  }));

  // State pentru cele 4 KPI-uri
  const [activeOrders, setActiveOrders] = useState<number>(0);
  const [todayTrips, setTodayTrips] = useState<number>(0);
  const [monthlyKm, setMonthlyKm] = useState<number>(0);
  const [availableDrivers, setAvailableDrivers] = useState<number>(0);

  useEffect(() => {
    const calculateKPIs = () => {
      try {
        // 1. Calculează comenzile active
        const orders = JSON.parse(localStorage.getItem('transport_orders') || '[]');
        const activeCount = orders.filter((order: any) => 
          order.status === 'active' || 
          order.status === 'in_progress' || 
          order.status === 'pending'
        ).length;
        setActiveOrders(activeCount);

        // 2. Calculează cursele de azi
        const trips = JSON.parse(localStorage.getItem('transport_trips') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayCount = trips.filter((trip: any) => {
          const tripDate = new Date(trip.date || trip.createdAt || trip.scheduledDate);
          return tripDate.toISOString().split('T')[0] === today;
        }).length;
        setTodayTrips(todayCount);

        // 3. Calculează km total luna curentă
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalKm = trips
          .filter((trip: any) => {
            const tripDate = new Date(trip.date || trip.createdAt || trip.scheduledDate);
            return tripDate.getMonth() === currentMonth && 
                   tripDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, trip: any) => {
            const loaded = parseFloat(trip.loadedKm || trip.kmLoaded || 0);
            const empty = parseFloat(trip.emptyKm || trip.kmEmpty || 0);
            return sum + loaded + empty;
          }, 0);
        setMonthlyKm(Math.round(totalKm));

        // 4. Calculează șoferii disponibili
        const drivers = JSON.parse(localStorage.getItem('transport_drivers') || '[]');
        const availableCount = drivers.filter((driver: any) => 
          driver.status === 'available' || 
          driver.available === true
        ).length;
        setAvailableDrivers(availableCount);

      } catch (error) {
        console.error('Eroare la calcularea KPI-urilor:', error);
        setActiveOrders(0);
        setTodayTrips(0);
        setMonthlyKm(0);
        setAvailableDrivers(0);
      }
    };

    // Date mock pentru testare
    const initializeMockData = () => {
      if (!localStorage.getItem('transport_orders')) {
        const mockOrders = [
          { id: '1', status: 'active', client: 'Client A', destination: 'București' },
          { id: '2', status: 'active', client: 'Client B', destination: 'Constanța' },
          { id: '3', status: 'completed', client: 'Client C', destination: 'Cluj' },
          { id: '4', status: 'in_progress', client: 'Client D', destination: 'Timișoara' },
          { id: '5', status: 'pending', client: 'Client E', destination: 'Iași' }
        ];
        localStorage.setItem('transport_orders', JSON.stringify(mockOrders));
      }

      if (!localStorage.getItem('transport_trips')) {
        const today = new Date();
        const yesterday = new Date(Date.now() - 86400000);
        
        const mockTrips = [
          { id: '1', date: today.toISOString(), loadedKm: 250, emptyKm: 50 },
          { id: '2', date: today.toISOString(), loadedKm: 180, emptyKm: 30 },
          { id: '3', date: yesterday.toISOString(), loadedKm: 320, emptyKm: 70 },
          { id: '4', date: today.toISOString(), loadedKm: 150, emptyKm: 20 }
        ];
        localStorage.setItem('transport_trips', JSON.stringify(mockTrips));
      }

      if (!localStorage.getItem('transport_drivers')) {
        const mockDrivers = [
          { id: '1', name: 'Ion Popescu', status: 'available' },
          { id: '2', name: 'Andrei Ionescu', status: 'available' },
          { id: '3', name: 'Mihai Popa', status: 'busy' },
          { id: '4', name: 'George Radu', status: 'available' },
          { id: '5', name: 'Vasile Marin', status: 'available' }
        ];
        localStorage.setItem('transport_drivers', JSON.stringify(mockDrivers));
      }
    };

    initializeMockData();
    calculateKPIs();

    const interval = setInterval(calculateKPIs, 30000);

    return () => {
      clearInterval(interval);
    };
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

        {/* Grid cu 4 KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Comenzi Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">
                Comenzi în desfășurare
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Curse Azi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTrips}</p>
              <p className="text-sm text-muted-foreground">
                Livrări programate azi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Km Total Luna</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {monthlyKm.toLocaleString('ro-RO')}
              </p>
              <p className="text-sm text-muted-foreground">
                Km parcurși în {new Date().toLocaleDateString('ro-RO', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Șoferi Disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{availableDrivers}</p>
              <p className="text-sm text-muted-foreground">
                Șoferi gata pentru curse noi
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Lista Comenzi</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel TanStack Table cu comenzi — import CSV, filtrare,
            sortare
          </CardContent>
        </Card>
      </Main>
    </>
  );
}