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
//   4. Dashboard operațional cu KPI-uri
//   5. Calcul cost per cursă (km gol vs încărcat)
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const topNavLinks = [
  { title: "Comenzi", href: "/transport/orders", isActive: false },
  { title: "Curse", href: "/transport/trips", isActive: false },
  { title: "Șoferi & Camioane", href: "/transport/drivers", isActive: false },
];

export default function TransportPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/transport/orders" && pathname === "/transport"),
  }));

  // State pentru KPI-uri
  const [kpiData, setKpiData] = useState({
    activeOrders: 0,
    todayTrips: 0,
    monthlyKm: 0,
    availableDrivers: 0
  });

  // Calculează KPI-urile din localStorage
  useEffect(() => {
    const calculateKPIs = () => {
      try {
        // 1. Calculează comenzile active
        const orders = JSON.parse(localStorage.getItem('transport_orders') || '[]');
        const activeOrdersCount = orders.filter((order: any) => 
          order.status === 'active' || order.status === 'in_progress' || order.status === 'pending'
        ).length;

        // 2. Calculează cursele de azi
        const trips = JSON.parse(localStorage.getItem('transport_trips') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayTripsCount = trips.filter((trip: any) => {
          const tripDate = new Date(trip.date || trip.createdAt || trip.scheduledDate).toISOString().split('T')[0];
          return tripDate === today;
        }).length;

        // 3. Calculează km total luna curentă
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyKmTotal = trips
          .filter((trip: any) => {
            const tripDate = new Date(trip.date || trip.createdAt || trip.scheduledDate);
            return tripDate.getMonth() === currentMonth && 
                   tripDate.getFullYear() === currentYear;
          })
          .reduce((total: number, trip: any) => {
            const loadedKm = parseFloat(trip.loadedKm || trip.kmLoaded || trip.distance || 0);
            const emptyKm = parseFloat(trip.emptyKm || trip.kmEmpty || 0);
            return total + loadedKm + emptyKm;
          }, 0);

        // 4. Calculează șoferii disponibili
        const drivers = JSON.parse(localStorage.getItem('transport_drivers') || '[]');
        const availableDriversCount = drivers.filter((driver: any) => 
          driver.status === 'available' || driver.available === true
        ).length;

        setKpiData({
          activeOrders: activeOrdersCount,
          todayTrips: todayTripsCount,
          monthlyKm: Math.round(monthlyKmTotal),
          availableDrivers: availableDriversCount
        });

      } catch (error) {
        console.error('Error calculating KPIs:', error);
        // În caz de eroare, setează valori default
        setKpiData({
          activeOrders: 0,
          todayTrips: 0,
          monthlyKm: 0,
          availableDrivers: 0
        });
      }
    };

    // Generează date mock pentru dezvoltare (opțional - poate fi eliminat în producție)
    const initializeMockData = () => {
      if (!localStorage.getItem('transport_orders')) {
        const mockOrders = [
          { id: '1', status: 'active', client: 'SC Transport SRL', destination: 'București' },
          { id: '2', status: 'active', client: 'Mega Distribution', destination: 'Constanța' },
          { id: '3', status: 'completed', client: 'Fast Delivery', destination: 'Timișoara' },
          { id: '4', status: 'in_progress', client: 'Euro Logistics', destination: 'Cluj' },
          { id: '5', status: 'pending', client: 'Express Cargo', destination: 'Brașov' }
        ];
        localStorage.setItem('transport_orders', JSON.stringify(mockOrders));
      }

      if (!localStorage.getItem('transport_trips')) {
        const today = new Date().toISOString();
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const mockTrips = [
          { id: '1', date: today, loadedKm: 250, emptyKm: 50, driver: 'Ion Popescu' },
          { id: '2', date: today, loadedKm: 180, emptyKm: 30, driver: 'Andrei Ionescu' },
          { id: '3', date: yesterday, loadedKm: 320, emptyKm: 70, driver: 'Mihai Popa' },
          { id: '4', date: today, loadedKm: 150, emptyKm: 20, driver: 'George Radu' }
        ];
        localStorage.setItem('transport_trips', JSON.stringify(mockTrips));
      }

      if (!localStorage.getItem('transport_drivers')) {
        const mockDrivers = [
          { id: '1', name: 'Ion Popescu', status: 'available', truck: 'B-123-XYZ' },
          { id: '2', name: 'Andrei Ionescu', status: 'available', truck: 'B-456-ABC' },
          { id: '3', name: 'Mihai Popa', status: 'busy', truck: 'CJ-789-DEF' },
          { id: '4', name: 'George Radu', status: 'available', truck: 'TM-012-GHI' },
          { id: '5', name: 'Vasile Marin', status: 'available', truck: 'CT-345-JKL' }
        ];
        localStorage.setItem('transport_drivers', JSON.stringify(mockDrivers));
      }
    };

    // Inițializează date mock dacă nu există
    initializeMockData();
    
    // Calculează KPI-urile
    calculateKPIs();

    // Refresh automat la fiecare 30 de secunde
    const interval = setInterval(calculateKPIs, 30000);

    // Ascultă pentru schimbări în localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('transport_')) {
        calculateKPIs();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Comenzi Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpiData.activeOrders}</p>
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
              <p className="text-3xl font-bold">{kpiData.todayTrips}</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('ro-RO')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Km Total Luna</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {kpiData.monthlyKm.toLocaleString('ro-RO')}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('ro-RO', { month: 'long' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Șoferi Disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpiData.availableDrivers}</p>
              <p className="text-sm text-muted-foreground">
                Disponibili pentru curse noi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TODO: Adăugați aici tabelul principal cu comenzi */}
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