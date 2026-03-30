import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  Play,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Trip, Driver, Order } from "@/modules/transport/types";
import { StatusBadge } from "./trips-status-badge";

interface TripMobileCardProps {
  trip: Trip;
  order: Order | undefined;
  driver: Driver | undefined;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onStatusChange: (trip: Trip) => void;
  onGenerateInvoice: (trip: Trip) => void;
}

function TripMobileCard({
  trip,
  order,
  driver,
  onEdit,
  onDelete,
  onStatusChange,
  onGenerateInvoice,
}: TripMobileCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border p-3 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium leading-tight min-w-0 truncate">
          {order?.clientName ?? trip.orderId}
        </div>
        <StatusBadge
          status={trip.status}
          label={t(`trips.status.${trip.status}`)}
        />
      </div>
      {order && (
        <div className="text-xs text-muted-foreground truncate">
          {order.origin} → {order.destination}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span className="truncate">
          {t("trips.mobile.driver")}:{" "}
          <span className="text-foreground">{driver?.name ?? "—"}</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.kmLoaded")}:{" "}
          <span className="text-foreground">{trip.kmLoaded} km</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.departure")}:{" "}
          <span className="text-foreground">{trip.departureDate}</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.kmEmpty")}:{" "}
          <span className="text-foreground">{trip.kmEmpty} km</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.arrival")}:{" "}
          <span className="text-foreground">{trip.estimatedArrivalDate}</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.fuelCost")}:{" "}
          <span className="text-foreground">{trip.fuelCost} RON</span>
        </span>
        <span className="truncate">
          {t("trips.mobile.revenue")}:{" "}
          <span className="text-foreground">{trip.revenue ?? 0} RON</span>
        </span>
      </div>
      <div className="flex gap-1.5 pt-1 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => onEdit(trip)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          {t("trips.actions.edit")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          disabled={trip.status === "in_desfasurare"}
          title={
            trip.status === "in_desfasurare"
              ? t("trips.delete.disabledTooltip")
              : t("trips.actions.delete")
          }
          onClick={() =>
            trip.status !== "in_desfasurare" && onDelete(trip)
          }
        >
          <Trash2 className="mr-1 h-3 w-3" />
          {t("trips.actions.delete")}
        </Button>
        {trip.status === "planned" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() =>
                onStatusChange({ ...trip, status: "in_desfasurare" })
              }
            >
              <Play className="mr-1 h-3 w-3" />
              {t("trips.actions.start")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-600 border-red-300"
              onClick={() => onStatusChange({ ...trip, status: "anulata" })}
            >
              <XCircle className="mr-1 h-3 w-3" />
              {t("trips.actions.cancel")}
            </Button>
          </>
        )}
        {trip.status === "in_desfasurare" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-green-600 border-green-400"
            onClick={() =>
              onStatusChange({ ...trip, status: "finalizata" })
            }
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("trips.actions.finish")}
          </Button>
        )}
        {trip.status === "in_desfasurare" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-amber-600 border-amber-400"
            onClick={() =>
              navigate({
                to: "/transport/trip-tracker/$tripId",
                params: { tripId: trip.id },
              })
            }
          >
            <MapPin className="mr-1 h-3 w-3" />
            {t("trips.actions.liveTrack")}
          </Button>
        )}
        {trip.status === "finalizata" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-violet-600 border-violet-400"
            onClick={() => onGenerateInvoice(trip)}
          >
            <FileText className="mr-1 h-3 w-3" />
            {t("trips.actions.generateInvoice")}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface TripMobileListProps {
  trips: Trip[];
  orders: Order[];
  drivers: Driver[];
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onStatusChange: (trip: Trip) => void;
  onGenerateInvoice: (trip: Trip) => void;
  noResultsLabel: string;
}

export function TripMobileList({
  trips,
  orders,
  drivers,
  onEdit,
  onDelete,
  onStatusChange,
  onGenerateInvoice,
  noResultsLabel,
}: TripMobileListProps) {
  return (
    <div className="space-y-3">
      {trips.length ? (
        trips.map((trip) => {
          const order = orders.find((o) => o.id === trip.orderId);
          const driver = drivers.find((d) => d.id === trip.driverId);
          return (
            <TripMobileCard
              key={trip.id}
              trip={trip}
              order={order}
              driver={driver}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onGenerateInvoice={onGenerateInvoice}
            />
          );
        })
      ) : (
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
          {noResultsLabel}
        </div>
      )}
    </div>
  );
}
