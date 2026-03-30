import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { DetailRow } from "./trips-dnd-cards";
import type { TripWithRelations } from "./trips-dnd-types";

export function TripDetailDialog({
  trip,
  open,
  onClose,
  t,
}: {
  trip: TripWithRelations | null;
  open: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!trip) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>{t("tripsCalendar.dialog.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("tripsCalendar.dialog.desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5">
          <DetailRow
            label={t("trips.fields.order")}
            value={trip.order?.clientName ?? trip.orderId}
          />
          {trip.order && (
            <DetailRow
              label={t("trips.columns.route")}
              value={`${trip.order.origin} → ${trip.order.destination}`}
            />
          )}
          <DetailRow
            label={t("trips.fields.driver")}
            value={trip.driver?.name ?? "—"}
          />
          <DetailRow
            label={t("trips.fields.truck")}
            value={
              trip.truck
                ? `${trip.truck.plateNumber} · ${trip.truck.brand} ${trip.truck.model}`
                : "—"
            }
          />
          <DetailRow
            label={t("trips.fields.departureDate")}
            value={trip.departureDate ?? "—"}
          />
          <DetailRow
            label={t("trips.fields.arrivalDate")}
            value={trip.estimatedArrivalDate ?? "—"}
          />
          <DetailRow
            label={t("trips.fields.kmLoaded")}
            value={`${trip.kmLoaded.toLocaleString()} km`}
          />
          <DetailRow
            label={t("trips.fields.kmEmpty")}
            value={`${trip.kmEmpty.toLocaleString()} km`}
          />
          <DetailRow
            label={t("trips.fields.fuelCost")}
            value={`${trip.fuelCost.toLocaleString()} RON`}
          />
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">
              {t("trips.fields.status")}
            </span>
            <span
              className={`font-medium text-right ${trip.status === "anulata" ? "text-red-600 dark:text-red-400" : trip.status === "finalizata" ? "text-green-600 dark:text-green-400" : trip.status === "in_desfasurare" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}
            >
              {t(`trips.status.${trip.status}`)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmMoveDialog({
  open,
  onConfirm,
  onCancel,
  trip,
  newDate,
  t,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  trip: TripWithRelations | null;
  newDate: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!trip) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("tripsDnd.confirmMove.title")}</DialogTitle>
          <DialogDescription>
            {t("tripsDnd.confirmMove.desc", {
              driver: trip.driver?.name ?? trip.driverId,
              date: newDate,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            {t("trips.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {t("tripsDnd.confirmMove.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
