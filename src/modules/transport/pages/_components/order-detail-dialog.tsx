import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Order, Trip } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const trips = React.useMemo(() => {
    if (!order) return [];
    return getCollection<Trip>(STORAGE_KEYS.trips).filter(
      (tr) => tr.orderId === order.id,
    );
  }, [order]);

  const totalFuelCost = trips.reduce((sum, tr) => sum + (tr.fuelCost ?? 0), 0);
  const totalKm = trips.reduce(
    (sum, tr) => sum + (tr.kmLoaded ?? 0) + (tr.kmEmpty ?? 0),
    0,
  );
  const costPerKm = totalKm > 0 ? totalFuelCost / totalKm : null;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("orders.detail.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("orders.detail.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3">
            <span className="text-muted-foreground">
              {t("orders.fields.client")}
            </span>
            <span className="font-medium">{order.clientName}</span>
            <span className="text-muted-foreground">
              {t("orders.detail.route")}
            </span>
            <span>
              {order.origin} &rarr; {order.destination}
            </span>
            <span className="text-muted-foreground">
              {t("orders.detail.date")}
            </span>
            <span className="tabular-nums">{order.date}</span>
            <span className="text-muted-foreground">
              {t("orders.detail.status")}
            </span>
            <span>{order.status}</span>
            {order.weight != null && (
              <>
                <span className="text-muted-foreground">
                  {t("orders.detail.weight")}
                </span>
                <span className="tabular-nums">
                  {order.weight} {t("orders.fields.weightUnit")}
                </span>
              </>
            )}
            {order.notes && (
              <>
                <span className="text-muted-foreground">
                  {t("orders.fields.notes")}
                </span>
                <span>{order.notes}</span>
              </>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium">{t("orders.costs.title")}</p>
            {trips.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("orders.costs.noTrips")}
              </p>
            ) : (
              <div className="space-y-1">
                {trips.map((trip, i) => {
                  const km = (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0);
                  const cpk = km > 0 ? trip.fuelCost / km : null;
                  return (
                    <div
                      key={trip.id}
                      className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-b last:border-0 pb-1 last:pb-0"
                    >
                      <span className="text-muted-foreground">
                        {t("orders.costs.trip", { index: i + 1 })}
                      </span>
                      <span className="tabular-nums">{trip.departureDate}</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.kmLoaded")}
                      </span>
                      <span className="tabular-nums">{trip.kmLoaded} km</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.kmEmpty")}
                      </span>
                      <span className="tabular-nums">{trip.kmEmpty} km</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.fuelCost")}
                      </span>
                      <span className="tabular-nums font-medium">
                        {trip.fuelCost.toFixed(2)} RON
                      </span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.costPerKm")}
                      </span>
                      <span className="tabular-nums">
                        {cpk != null ? `${cpk.toFixed(2)} RON/km` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 pt-2 border-t text-sm font-medium">
              <span>{t("orders.costs.totalFuel")}</span>
              <span className="tabular-nums">
                {totalFuelCost.toFixed(2)} RON
              </span>
              <span>{t("orders.costs.totalCostPerKm")}</span>
              <span className="tabular-nums">
                {costPerKm != null ? `${costPerKm.toFixed(2)} RON/km` : "—"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("orders.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
