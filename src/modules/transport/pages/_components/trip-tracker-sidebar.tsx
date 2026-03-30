import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Square } from "lucide-react";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";

export interface ProgressCardProps {
  progressPct: number;
  running: boolean;
  progress: number;
  onStop: () => void;
}

export function ProgressCard({
  progressPct,
  running,
  progress,
  onStop,
}: ProgressCardProps) {
  const { t } = useTranslation();

  return (
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
              onClick={onStop}
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
  );
}

export interface StopsCardProps {
  stopNames: string[];
  order: Order | null;
  isStopReached: (waypointIdx: number) => boolean;
  totalKm: number | null;
}

export function StopsCard({
  stopNames,
  order,
  isStopReached,
  totalKm,
}: StopsCardProps) {
  const { t } = useTranslation();

  if (stopNames.length === 0) return null;

  return (
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
  );
}

export interface TripDetailsCardProps {
  trip: Trip;
  order: Order | null;
  driver: Driver | null;
  truck: Truck | null;
}

export function TripDetailsCard({
  trip,
  order,
  driver,
  truck,
}: TripDetailsCardProps) {
  const { t } = useTranslation();

  return (
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
  );
}
