import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  getCoords,
  haversineKm,
  interpolateAlongRoute,
  traveledSegments,
  makeTruckIcon,
  makeEndpointIcon,
  makeStopIcon,
  PanTo,
  type TrackerData,
} from "./_components/trip-tracker-utils";
import {
  ProgressCard,
  StopsCard,
  TripDetailsCard,
} from "./_components/trip-tracker-sidebar";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
            <ProgressCard
              progressPct={progressPct}
              running={running}
              progress={progress}
              onStop={handleStop}
            />

            <StopsCard
              stopNames={stopNames}
              order={order}
              isStopReached={isStopReached}
              totalKm={totalKm}
            />

            <TripDetailsCard
              trip={trip}
              order={order}
              driver={driver}
              truck={truck}
            />
          </div>
        </div>
      </Main>
    </>
  );
}
