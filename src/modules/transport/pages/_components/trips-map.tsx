import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const STATUS_COLORS: Record<Trip["status"], string> = {
  planned: "#3b82f6",
  in_desfasurare: "#f59e0b",
  finalizata: "#22c55e",
  anulata: "#ef4444",
};

const STATUS_FILTER_OPTIONS: Trip["status"][] = [
  "planned",
  "in_desfasurare",
  "finalizata",
  "anulata",
];

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function makeStopIcon(color: string, num: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;font-family:sans-serif">${num}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    }
  }, [map, bounds]);
  return null;
}

type EnrichedTrip = {
  trip: Trip;
  order: Order | undefined;
  driver: Driver | undefined;
  truck: Truck | undefined;
  originCoords: [number, number] | null;
  destCoords: [number, number] | null;
  stopsCoords: ([number, number] | null)[];
};

function useData() {
  const [enriched, setEnriched] = React.useState<EnrichedTrip[]>([]);

  React.useEffect(() => {
    const trips = getCollection<Trip>(STORAGE_KEYS.trips);
    const orders = getCollection<Order>(STORAGE_KEYS.orders);
    const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
    const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);

    setEnriched(
      trips.map((trip) => {
        const order = orders.find((o) => o.id === trip.orderId);
        const driver = drivers.find((d) => d.id === trip.driverId);
        const truck = trucks.find((tr) => tr.id === trip.truckId);
        const stopsCoords = (order?.stops ?? []).map((s) => getCoords(s));
        return {
          trip,
          order,
          driver,
          truck,
          originCoords: order ? getCoords(order.origin) : null,
          destCoords: order ? getCoords(order.destination) : null,
          stopsCoords,
        };
      }),
    );
  }, []);

  return enriched;
}

export default function TripsMapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enriched = useData();

  const [activeFilters, setActiveFilters] = React.useState<Set<Trip["status"]>>(
    new Set(),
  );

  const filtered = React.useMemo(
    () =>
      enriched.filter(
        (e) => activeFilters.size === 0 || activeFilters.has(e.trip.status),
      ),
    [enriched, activeFilters],
  );

  const bounds = React.useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [];
    filtered.forEach(({ originCoords, destCoords, stopsCoords }) => {
      if (originCoords) pts.push(originCoords);
      stopsCoords.forEach((c) => {
        if (c) pts.push(c);
      });
      if (destCoords) pts.push(destCoords);
    });
    if (pts.length === 0) return null;
    return pts as unknown as L.LatLngBoundsExpression;
  }, [filtered]);

  function toggleFilter(status: Trip["status"]) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trips.title")}</h1>
      </Header>

      <Main>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
            <CardTitle className="text-base md:text-lg">
              {t("tripsMap.title")}
            </CardTitle>
            <Tabs
              value="map"
              onValueChange={(v) => {
                if (v === "table") navigate({ to: "/transport/trips" });
                if (v === "calendar")
                  navigate({ to: "/transport/trips-calendar" });
                if (v === "dnd")
                  navigate({ to: "/transport/trips-calendar-dnd" });
              }}
            >
              <TabsList>
                <TabsTrigger value="table">
                  <span className="hidden sm:inline">
                    {t("tripsCalendar.tabs.table")}
                  </span>
                  <span className="sm:hidden">
                    {t("tripsCalendar.tabs.tableShort")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <span className="hidden sm:inline">
                    {t("tripsCalendar.tabs.calendar")}
                  </span>
                  <span className="sm:hidden">
                    {t("tripsCalendar.tabs.calendarShort")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="dnd">
                  <span className="hidden sm:inline">
                    {t("tripsDnd.tabs.dnd")}
                  </span>
                  <span className="sm:hidden">
                    {t("tripsDnd.tabs.dndShort")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="map">
                  <span className="hidden sm:inline">
                    {t("tripsMap.tabs.map")}
                  </span>
                  <span className="sm:hidden">
                    {t("tripsMap.tabs.mapShort")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-3 p-3 md:p-6">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium mr-1">
                {t("tripsMap.filterLabel")}:
              </span>
              {STATUS_FILTER_OPTIONS.map((status) => {
                const active = activeFilters.has(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleFilter(status)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium transition-all ${
                      active
                        ? "opacity-100 shadow-sm"
                        : "opacity-40 hover:opacity-70"
                    }`}
                    style={{
                      borderColor: STATUS_COLORS[status],
                      color: STATUS_COLORS[status],
                      backgroundColor: active
                        ? `${STATUS_COLORS[status]}18`
                        : "transparent",
                    }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: STATUS_COLORS[status],
                      }}
                    />
                    {t(`trips.status.${status}`)}
                  </button>
                );
              })}
              {activeFilters.size > 0 && (
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  {t("tripsMap.clearFilter")}
                </button>
              )}
            </div>

            <div
              className="rounded-lg overflow-hidden border"
              style={{ height: 520 }}
            >
              <MapContainer
                center={[45.9432, 24.9668]}
                zoom={6}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {bounds && <FitBounds bounds={bounds} />}

                {filtered.map(
                  ({
                    trip,
                    order,
                    driver,
                    truck,
                    originCoords,
                    destCoords,
                    stopsCoords,
                  }) => {
                    const color = STATUS_COLORS[trip.status];

                    // Build the full route: origin → stops → destination
                    const routePoints: [number, number][] = [];
                    if (originCoords) routePoints.push(originCoords);
                    stopsCoords.forEach((c) => {
                      if (c) routePoints.push(c);
                    });
                    if (destCoords) routePoints.push(destCoords);

                    // Estimated km: sum of haversine distances between consecutive points
                    function haversineKm(
                      a: [number, number],
                      b: [number, number],
                    ) {
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
                    const totalKm =
                      routePoints.length > 1
                        ? Math.round(
                            routePoints
                              .slice(1)
                              .reduce(
                                (acc, pt, i) =>
                                  acc + haversineKm(routePoints[i], pt),
                                0,
                              ),
                          )
                        : null;

                    return (
                      <React.Fragment key={trip.id}>
                        {routePoints.length > 1 && (
                          <Polyline
                            positions={routePoints}
                            pathOptions={{
                              color,
                              weight: 2.5,
                              opacity: 0.75,
                              dashArray:
                                trip.status === "anulata" ? "6 4" : undefined,
                            }}
                          />
                        )}

                        {/* Origin marker */}
                        {originCoords && (
                          <Marker
                            position={originCoords}
                            icon={makeIcon(color)}
                          >
                            <Popup>
                              <div className="text-sm space-y-1 min-w-[180px]">
                                <div className="font-semibold">
                                  {order?.origin ?? "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("tripsMap.popup.origin")}
                                </div>
                                <hr className="my-1" />
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.client")}:{" "}
                                  </span>
                                  {order?.clientName ?? "—"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.driver")}:{" "}
                                  </span>
                                  {driver?.name ?? "—"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.truck")}:{" "}
                                  </span>
                                  {truck?.plateNumber ?? "—"}
                                </div>
                                {totalKm != null && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      {t("tripsMap.popup.estimatedKm")}:{" "}
                                    </span>
                                    {totalKm} km
                                  </div>
                                )}
                                <div className="flex items-center gap-1 pt-1">
                                  <span
                                    className="inline-block rounded-full"
                                    style={{
                                      width: 8,
                                      height: 8,
                                      background: color,
                                    }}
                                  />
                                  <span
                                    style={{ color }}
                                    className="font-medium text-xs"
                                  >
                                    {t(`trips.status.${trip.status}`)}
                                  </span>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Intermediate stop markers */}
                        {(order?.stops ?? []).map((stopName, stopIdx) => {
                          const coords = stopsCoords[stopIdx];
                          if (!coords) return null;
                          return (
                            <Marker
                              key={`stop-${trip.id}-${stopIdx}`}
                              position={coords}
                              icon={makeStopIcon(color, stopIdx + 1)}
                            >
                              <Popup>
                                <div className="text-sm space-y-1 min-w-[160px]">
                                  <div className="font-semibold">
                                    {stopName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("tripsMap.popup.stop")} {stopIdx + 1}
                                  </div>
                                  <hr className="my-1" />
                                  <div>
                                    <span className="text-muted-foreground">
                                      {t("tripsMap.popup.client")}:{" "}
                                    </span>
                                    {order?.clientName ?? "—"}
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}

                        {/* Destination marker */}
                        {destCoords && (
                          <Marker position={destCoords} icon={makeIcon(color)}>
                            <Popup>
                              <div className="text-sm space-y-1 min-w-[180px]">
                                <div className="font-semibold">
                                  {order?.destination ?? "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("tripsMap.popup.destination")}
                                </div>
                                <hr className="my-1" />
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.client")}:{" "}
                                  </span>
                                  {order?.clientName ?? "—"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.driver")}:{" "}
                                  </span>
                                  {driver?.name ?? "—"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("tripsMap.popup.arrival")}:{" "}
                                  </span>
                                  {trip.estimatedArrivalDate}
                                </div>
                                {totalKm != null && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      {t("tripsMap.popup.estimatedKm")}:{" "}
                                    </span>
                                    {totalKm} km
                                  </div>
                                )}
                                <div className="flex items-center gap-1 pt-1">
                                  <span
                                    className="inline-block rounded-full"
                                    style={{
                                      width: 8,
                                      height: 8,
                                      background: color,
                                    }}
                                  />
                                  <span
                                    style={{ color }}
                                    className="font-medium text-xs"
                                  >
                                    {t(`trips.status.${trip.status}`)}
                                  </span>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}
                      </React.Fragment>
                    );
                  },
                )}
              </MapContainer>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              {STATUS_FILTER_OPTIONS.map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      background: STATUS_COLORS[status],
                    }}
                  />
                  {t(`trips.status.${status}`)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
