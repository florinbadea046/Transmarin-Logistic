import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Square } from "lucide-react";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CITY_COORDS: Record<string, [number, number]> = {
  București: [44.4268, 26.1025],
  Bucharest: [44.4268, 26.1025],
  Cluj: [46.7712, 23.6236],
  "Cluj-Napoca": [46.7712, 23.6236],
  Timișoara: [45.7489, 21.2087],
  Timisoara: [45.7489, 21.2087],
  Iași: [47.1585, 27.6014],
  Iasi: [47.1585, 27.6014],
  Constanța: [44.1598, 28.6348],
  Constanta: [44.1598, 28.6348],
  Brașov: [45.6427, 25.5887],
  Brasov: [45.6427, 25.5887],
  Galați: [45.4353, 28.0077],
  Galati: [45.4353, 28.0077],
  Craiova: [44.3302, 23.7949],
  Ploiești: [44.9365, 26.0138],
  Ploiesti: [44.9365, 26.0138],
  Oradea: [47.0458, 21.9189],
  Sibiu: [45.7983, 24.1256],
  Arad: [46.1731, 21.3154],
  Bacău: [46.5671, 26.9146],
  Bacau: [46.5671, 26.9146],
  Pitești: [44.8565, 24.8692],
  Pitesti: [44.8565, 24.8692],
  Târgu: [46.5386, 24.5581],
  Suceava: [47.6515, 26.2556],
  Drobeta: [44.6334, 22.6566],
  Buzău: [45.15, 26.8236],
  Buzau: [45.15, 26.8236],
};

function getCoords(city: string): [number, number] | null {
  const normalized = city.trim();
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];
  const key = Object.keys(CITY_COORDS).find((k) =>
    normalized.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? CITY_COORDS[key] : null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function interpolateAlongRoute(
  waypoints: [number, number][],
  progress: number,
): [number, number] | null {
  if (waypoints.length < 2) return null;
  if (progress <= 0) return waypoints[0];
  if (progress >= 1) return waypoints[waypoints.length - 1];

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineKm(waypoints[i], waypoints[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen === 0) return waypoints[0];

  const targetDist = progress * totalLen;
  let traveled = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= targetDist) {
      const t = segLen === 0 ? 0 : (targetDist - traveled) / segLen;
      const a = waypoints[i];
      const b = waypoints[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    traveled += segLen;
  }
  return waypoints[waypoints.length - 1];
}

function traveledSegments(
  waypoints: [number, number][],
  progress: number,
  currentPos: [number, number],
): [number, number][] {
  if (waypoints.length < 2 || progress <= 0) return [];

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineKm(waypoints[i], waypoints[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return [];

  const targetDist = progress * totalLen;
  const result: [number, number][] = [waypoints[0]];
  let traveled = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= targetDist) {
      result.push(currentPos);
      break;
    }
    traveled += segLen;
    result.push(waypoints[i + 1]);
  }
  return result;
}

function makeTruckIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 0 0 2px #f59e0b,0 2px 6px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

function makeEndpointIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10],
  });
}

function makeStopIcon(num: number, reached: boolean) {
  const bg = reached ? "#22c55e" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;font-family:sans-serif">${num}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function PanTo({ position }: { position: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.panTo(position, { animate: true, duration: 0.8 });
  }, [map, position]);
  return null;
}

type TrackerData = {
  trip: Trip | null;
  order: Order | null;
  driver: Driver | null;
  truck: Truck | null;
  waypoints: [number, number][];
  stopNames: string[];
};

export default function TripTrackerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { tripId?: string };
  const tripId = params.tripId;

  const [data, setData] = React.useState<TrackerData>({
    trip: null,
    order: null,
    driver: null,
    truck: null,
    waypoints: [],
    stopNames: [],
  });

  React.useEffect(() => {
    const trips = getCollection<Trip>(STORAGE_KEYS.trips);
    const orders = getCollection<Order>(STORAGE_KEYS.orders);
    const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
    const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);

    const trip = trips.find((tr) => tr.id === tripId) ?? null;
    const order = trip
      ? (orders.find((o) => o.id === trip.orderId) ?? null)
      : null;
    const driver = trip
      ? (drivers.find((d) => d.id === trip.driverId) ?? null)
      : null;
    const truck = trip
      ? (trucks.find((tr) => tr.id === trip.truckId) ?? null)
      : null;

    const pts: [number, number][] = [];
    const stopNames: string[] = order?.stops ?? [];

    const originCoords = order ? getCoords(order.origin) : null;
    if (originCoords) pts.push(originCoords);

    for (const stop of stopNames) {
      const c = getCoords(stop);
      if (c) pts.push(c);
    }

    const destCoords = order ? getCoords(order.destination) : null;
    if (destCoords) pts.push(destCoords);

    setData({ trip, order, driver, truck, waypoints: pts, stopNames });
  }, [tripId]);

  const { trip, order, driver, truck, waypoints, stopNames } = data;

  const originCoords = waypoints[0] ?? null;
  const destCoords = waypoints[waypoints.length - 1] ?? null;
  const hasRoute = waypoints.length >= 2;

  const [progress, setProgress] = React.useState(0);
  const [running, setRunning] = React.useState(true);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = React.useRef(false);

  const waypointsRef = React.useRef(waypoints);
  React.useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  React.useEffect(() => {
    if (!trip || initializedRef.current) return;
    initializedRef.current = true;
    const dep = new Date(trip.departureDate).getTime();
    const arr = new Date(trip.estimatedArrivalDate).getTime();
    const now = Date.now();
    if (arr <= dep) return;
    setProgress(Math.min(Math.max((now - dep) / (arr - dep), 0), 0.99));
  }, [trip]);

  React.useEffect(() => {
    if (!running || waypointsRef.current.length < 2) return;
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.005;
        if (next >= 1) {
          clearInterval(intervalRef.current!);
          return 1;
        }
        return next;
      });
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleStop = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const markerPos = hasRoute
    ? interpolateAlongRoute(waypoints, progress)
    : null;

  const traveled =
    markerPos && hasRoute
      ? traveledSegments(waypoints, progress, markerPos)
      : [];

  const progressPct = Math.round(progress * 100);

  function isStopReached(waypointIdx: number): boolean {
    if (!hasRoute) return false;
    const segLengths: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = haversineKm(waypoints[i], waypoints[i + 1]);
      segLengths.push(d);
      totalLen += d;
    }
    if (totalLen === 0) return false;
    let distToStop = 0;
    for (let i = 0; i < waypointIdx; i++) distToStop += segLengths[i];
    return progress * totalLen >= distToStop;
  }

  const totalKm = hasRoute
    ? Math.round(
        waypoints
          .slice(1)
          .reduce((acc, pt, i) => acc + haversineKm(waypoints[i], pt), 0),
      )
    : null;

  if (!trip) {
    return (
      <>
        <Header fixed>
          <h1 className="text-lg font-semibold">{t("tripTracker.title")}</h1>
        </Header>
        <Main>
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <p>{t("tripTracker.notFound")}</p>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/transport/trips" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("tripTracker.backToTrips")}
            </Button>
          </div>
        </Main>
      </>
    );
  }

  return (
    <>
      <Header fixed>
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => navigate({ to: "/transport/trips" })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">
              {t("tripTracker.backToTrips")}
            </span>
          </Button>
          <h1 className="truncate text-base font-semibold sm:text-lg">
            {t("tripTracker.title")}
          </h1>
        </div>
      </Header>

      <Main>
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="truncate text-sm sm:text-base">
                  {order
                    ? `${order.origin}${stopNames.length > 0 ? ` → ${stopNames.join(" → ")}` : ""} → ${order.destination}`
                    : t("tripTracker.unknownRoute")}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="shrink-0 text-amber-600 border-amber-400"
                >
                  {t("trips.status.in_desfasurare")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!hasRoute ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground px-6 text-center">
                  {t("tripTracker.noCoordsMessage")}
                </div>
              ) : (
                <div className="h-[300px] sm:h-[420px] lg:h-[560px]">
                  <MapContainer
                    center={originCoords!}
                    zoom={6}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Polyline
                      positions={waypoints}
                      pathOptions={{
                        color: "#94a3b8",
                        weight: 2,
                        dashArray: "5 5",
                      }}
                    />

                    {traveled.length > 1 && (
                      <Polyline
                        positions={traveled}
                        pathOptions={{ color: "#f59e0b", weight: 3 }}
                      />
                    )}

                    <Marker
                      position={originCoords!}
                      icon={makeEndpointIcon("#22c55e")}
                    >
                      <Popup>
                        <span className="text-sm font-medium">
                          {t("tripsMap.popup.origin")}: {order?.origin}
                        </span>
                      </Popup>
                    </Marker>

                    {stopNames.map((stopName, idx) => {
                      const wpIdx = idx + 1;
                      if (wpIdx >= waypoints.length - 1) return null;
                      const coords = waypoints[wpIdx];
                      const reached = isStopReached(wpIdx);
                      return (
                        <Marker
                          key={`stop-${idx}`}
                          position={coords}
                          icon={makeStopIcon(idx + 1, reached)}
                        >
                          <Popup>
                            <div className="text-sm space-y-1 min-w-[140px]">
                              <div className="font-semibold">{stopName}</div>
                              <div className="text-xs text-muted-foreground">
                                {t("tripsMap.popup.stop")} {idx + 1}
                              </div>
                              {reached && (
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ {t("tripTracker.stopReached")}
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    <Marker
                      position={destCoords!}
                      icon={makeEndpointIcon("#ef4444")}
                    >
                      <Popup>
                        <span className="text-sm font-medium">
                          {t("tripsMap.popup.destination")}:{" "}
                          {order?.destination}
                        </span>
                      </Popup>
                    </Marker>

                    {markerPos && (
                      <>
                        <PanTo position={markerPos} />
                        <Marker position={markerPos} icon={makeTruckIcon()}>
                          <Popup>
                            <div className="text-sm space-y-1 min-w-[160px]">
                              <div className="font-semibold">
                                {truck?.plateNumber ?? "—"}
                              </div>
                              <div>
                                {t("tripsMap.popup.driver")}:{" "}
                                {driver?.name ?? "—"}
                              </div>
                              <div>
                                {t("tripTracker.progress")}: {progressPct}%
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </>
                    )}
                  </MapContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("tripTracker.progress")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums mb-3">
                  {progressPct}%
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-4">
                  {running && progress < 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={handleStop}
                    >
                      <Square className="mr-2 h-3 w-3" />
                      {t("tripTracker.stopTracking")}
                    </Button>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      {progress >= 1
                        ? t("tripTracker.arrived")
                        : t("tripTracker.stopped")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {stopNames.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("orders.stops.section")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      {t("tripsMap.popup.origin")}
                    </span>
                    <span className="font-medium ml-auto text-right truncate">
                      {order?.origin}
                    </span>
                  </div>
                  {stopNames.map((name, idx) => {
                    const wpIdx = idx + 1;
                    const reached = isStopReached(wpIdx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold shrink-0"
                          style={{
                            background: reached ? "#22c55e" : "#94a3b8",
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-medium truncate">{name}</span>
                        {reached && (
                          <span className="ml-auto text-green-600 text-xs shrink-0">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      {t("tripsMap.popup.destination")}
                    </span>
                    <span className="font-medium ml-auto text-right truncate">
                      {order?.destination}
                    </span>
                  </div>
                  {totalKm != null && (
                    <div className="pt-1 border-t text-xs text-muted-foreground flex justify-between">
                      <span>{t("tripsMap.popup.estimatedKm")}</span>
                      <span className="font-medium tabular-nums">
                        {totalKm} km
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("tripTracker.details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("tripsMap.popup.driver")}
                  </span>
                  <span className="font-medium text-right">
                    {driver?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("tripsMap.popup.truck")}
                  </span>
                  <span className="font-medium text-right">
                    {truck ? `${truck.plateNumber} · ${truck.brand}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("trips.fields.departureDate")}
                  </span>
                  <span className="font-medium text-right">
                    {trip.departureDate}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("trips.fields.arrivalDate")}
                  </span>
                  <span className="font-medium text-right">
                    {trip.estimatedArrivalDate}
                  </span>
                </div>
                {order && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("tripsMap.popup.client")}
                    </span>
                    <span className="font-medium text-right">
                      {order.clientName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("trips.columns.kmLoaded")}
                  </span>
                  <span className="font-medium">
                    {trip.kmLoaded.toLocaleString()} km
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  );
}
