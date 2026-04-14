// A39. Dashboard Dispecer Live
// Ruta: /pages/dispatcher-live.tsx
// Auto-refresh 30s
// Layout 3 coloane: Stanga - curse active cu progress %
//                   Centru - harta Leaflet cu markere
//                   Dreapta - feed ultimele 10 audit log
// Card-uri sus: curse active, comenzi neasignate, camioane disponibile, alerte noi
// Quick-action: "Aloca Cursa Noua"
// Responsive: useMobile(640)
// i18n: fara diacritice in cod

import * as React from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Truck, Package, AlertTriangle, Activity, RefreshCw, Plus,
  MapPin, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Trip, Order, Truck as TruckType, Driver } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ── Fix Leaflet default icons ──────────────────────────────

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Tipuri ─────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityLabel?: string;
  timestamp: string;
  detailKey?: string;
}

// ── Coordonate orase Romania ───────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "Constanta": [44.1598, 28.6348],
  "Bucuresti": [44.4268, 26.1025],
  "Cluj-Napoca": [46.7712, 23.6236],
  "Timisoara": [45.7489, 21.2087],
  "Iasi": [47.1585, 27.6014],
  "Braila": [45.2692, 27.9574],
  "Galati": [45.4353, 28.0080],
  "Brasov": [45.6427, 25.5887],
  "Sibiu": [45.7983, 24.1256],
  "Craiova": [44.3302, 23.7949],
  "Ploiesti": [44.9459, 26.0126],
  "Oradea": [47.0722, 21.9214],
  "Arad": [46.1866, 21.3123],
  "Deva": [45.8830, 22.9109],
  "Pitesti": [44.8565, 24.8690],
  "Bacau": [46.5671, 26.9146],
  "Targu Mures": [46.5386, 24.5578],
  "Suceava": [47.6514, 26.2556],
  "Botosani": [47.7487, 26.6659],
};

function getCityCoords(city: string): [number, number] | null {
  const key = Object.keys(CITY_COORDS).find(
    (k) => city.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? CITY_COORDS[key] : null;
}

// ── Calcul progres cursa ───────────────────────────────────

function getTripProgress(trip: Trip): number {
  if (trip.status === "finalizata") return 100;
  if (trip.status === "anulata") return 0;
  if (trip.status === "planned") return 0;

  const depart = new Date(trip.departureDate).getTime();
  const arrive = new Date(trip.estimatedArrivalDate).getTime();
  const now = Date.now();

  if (now >= arrive) return 95;
  if (now <= depart) return 5;
  const total = arrive - depart;
  if (total <= 0) return 50;
  return Math.min(95, Math.max(5, Math.round(((now - depart) / total) * 100)));
}

// ── Status color ───────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "in_desfasurare": return "bg-blue-500";
    case "finalizata": return "bg-green-500";
    case "planned": return "bg-yellow-500";
    case "anulata": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

// ── KPI Cards ──────────────────────────────────────────────

function KpiCards({
  activeTrips, unassignedOrders, availableTrucks, alertCount,
}: {
  activeTrips: number;
  unassignedOrders: number;
  availableTrucks: number;
  alertCount: number;
}) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("dispatcherLive.kpi.activeTrips"),
      value: activeTrips,
      icon: <Activity className="h-4 w-4 text-blue-500" />,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: t("dispatcherLive.kpi.unassignedOrders"),
      value: unassignedOrders,
      icon: <Package className="h-4 w-4 text-yellow-500" />,
      color: unassignedOrders > 0 ? "text-yellow-600 dark:text-yellow-400" : "",
    },
    {
      title: t("dispatcherLive.kpi.availableTrucks"),
      value: availableTrucks,
      icon: <Truck className="h-4 w-4 text-green-500" />,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: t("dispatcherLive.kpi.alerts"),
      value: alertCount,
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      color: alertCount > 0 ? "text-red-600 dark:text-red-400" : "",
    },
  ];

  return (
    <div className="grid gap-3 mb-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, value, icon, color }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-3 sm:px-6 sm:pt-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className={cn("text-xl sm:text-2xl font-bold", color)}>{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Active Trips Panel ─────────────────────────────────────

function ActiveTripsPanel({
  trips, orders, drivers, trucks,
}: {
  trips: Trip[];
  orders: Order[];
  drivers: Driver[];
  trucks: TruckType[];
}) {
  const { t } = useTranslation();

  const active = trips.filter((tr) =>
    tr.status === "in_desfasurare" || tr.status === "planned",
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          {t("dispatcherLive.trips.title")} ({active.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("dispatcherLive.trips.noActive")}</p>
          ) : (
            <div className="space-y-3 pt-2">
              {active.map((trip) => {
                const order = orders.find((o) => o.id === trip.orderId);
                const driver = drivers.find((d) => d.id === trip.driverId);
                const truck = trucks.find((tr) => tr.id === trip.truckId);
                const progress = getTripProgress(trip);

                return (
                  <div key={trip.id} className="rounded-lg border bg-card/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {order?.origin ?? "—"} → {order?.destination ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {driver?.name ?? trip.driverId} · {truck?.plateNumber ?? trip.truckId}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0 text-white border-0", statusColor(trip.status))}>
                        {t(`dispatcherLive.trips.status.${trip.status}`)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("dispatcherLive.trips.progress")}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{t("dispatcherLive.trips.eta")}: {trip.estimatedArrivalDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Map Panel ──────────────────────────────────────────────

function MapPanel({ trips, orders }: { trips: Trip[]; orders: Order[] }) {
  const { t } = useTranslation();

  const markers: { pos: [number, number]; label: string; type: "origin" | "destination" }[] = [];

  for (const trip of trips.filter((tr) => tr.status === "in_desfasurare")) {
    const order = orders.find((o) => o.id === trip.orderId);
    if (!order) continue;
    const orig = getCityCoords(order.origin);
    const dest = getCityCoords(order.destination);
    if (orig) markers.push({ pos: orig, label: `${order.origin} (${t("dispatcherLive.map.origin")})`, type: "origin" });
    if (dest) markers.push({ pos: dest, label: `${order.destination} (${t("dispatcherLive.map.destination")})`, type: "destination" });
  }

  const center: [number, number] = [45.9432, 24.9668]; // Romania centru

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" />
          {t("dispatcherLive.map.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        <div className="h-full min-h-[300px] rounded-md overflow-hidden border">
          <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((m, i) => (
              <Marker key={i} position={m.pos}>
                <Popup>{m.label}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Audit Feed ─────────────────────────────────────────────

function AuditFeed() {
  const { t } = useTranslation();
  const entries = React.useMemo(() => {
    try {
      const raw = getCollection<AuditEntry>(STORAGE_KEYS.auditLog);
      return [...raw].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
    } catch { return []; }
  }, []);

  function actionIcon(action: string) {
    switch (action) {
      case "create": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
      case "delete": return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      default: return <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    }
  }

  function formatTime(ts: string): string {
    try {
      return new Date(ts).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  }

  function formatDate(ts: string): string {
    try {
      return new Date(ts).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
    } catch { return "—"; }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-500" />
          {t("dispatcherLive.feed.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("dispatcherLive.feed.noEvents")}</p>
          ) : (
            <div className="space-y-1 pt-2">
              {entries.map((entry, i) => (
                <React.Fragment key={entry.id}>
                  <div className="flex items-start gap-2 py-1.5">
                    {actionIcon(entry.action)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {entry.entityLabel ?? entry.entity}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t(`dispatcherLive.feed.action.${entry.action}`, { defaultValue: entry.action })}
                        {" · "}{entry.entity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>
                  {i < entries.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Pagina ─────────────────────────────────────────────────

export default function DispatcherLivePage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const navigate = useNavigate();

  function loadData() {
    const trips = getCollection<Trip>(STORAGE_KEYS.trips);
    const orders = getCollection<Order>(STORAGE_KEYS.orders);
    const trucks = getCollection<TruckType>(STORAGE_KEYS.trucks);
    const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
    return { trips, orders, trucks, drivers };
  }

  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const [data, setData] = React.useState(() => loadData());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(loadData());
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setData(loadData());
    setLastRefresh(new Date());
  };

  const { trips, orders, trucks, drivers } = data;

  const activeTrips = trips.filter((tr) =>
    tr.status === "in_desfasurare" || tr.status === "planned",
  ).length;

  const unassignedOrders = orders.filter((o) =>
    o.status === "pending",
  ).length;

  const availableTrucks = trucks.filter((tr) => tr.status === "available").length;

  // Alerte: camioane cu documente < 30 zile
  const [alertCount, setAlertCount] = React.useState(0);
  React.useEffect(() => {
    const now = Date.now();
    let count = 0;
    for (const truck of trucks) {
      for (const field of [truck.itpExpiry, truck.rcaExpiry, truck.vignetteExpiry]) {
        if (!field) continue;
        try {
          const daysLeft = Math.ceil((new Date(field).getTime() - now) / 86400000);
          if (daysLeft < 30) count++;
        } catch { /* skip invalid dates */ }
      }
    }
    setAlertCount(count);
  }, [trucks]);

  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">{t("dispatcherLive.title")}</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} title={t("dispatcherLive.refresh")}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" className="h-8 w-8" onClick={() => navigate({ to: "/transport/trips" })} title={t("dispatcherLive.allocateTrip")}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Header>
      <Main>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {t("dispatcherLive.lastRefresh")}: {lastRefresh.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <KpiCards
          activeTrips={activeTrips}
          unassignedOrders={unassignedOrders}
          availableTrucks={availableTrucks}
          alertCount={alertCount}
        />

        {isMobile ? (
          <div className="space-y-4">
            <ActiveTripsPanel trips={trips} orders={orders} drivers={drivers} trucks={trucks} />
            <div className="h-[300px] rounded-lg overflow-hidden border">
              <MapPanel trips={trips} orders={orders} />
            </div>
            <AuditFeed />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            <ActiveTripsPanel trips={trips} orders={orders} drivers={drivers} trucks={trucks} />
            <MapPanel trips={trips} orders={orders} />
            <AuditFeed />
          </div>
        )}
      </Main>
    </>
  );
}