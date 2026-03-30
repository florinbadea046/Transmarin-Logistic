import * as React from "react";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { STATUS_BADGE, STATUS_DOT } from "./trips-dnd-types";
import type { TripWithRelations } from "./trips-dnd-types";

export function TripCard({
  trip,
  isDragging,
  onClick,
  compact,
}: {
  trip: TripWithRelations;
  isDragging?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded border px-1 py-0.5 mb-0.5 transition-opacity flex items-start gap-0.5 group ${STATUS_BADGE[trip.status]} ${isDragging ? "opacity-50" : "hover:opacity-80"}`}
    >
      {!compact && (
        <GripVertical className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-0.5 min-w-0">
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[trip.status]}`}
          />
          <span className="text-[9px] font-medium truncate leading-snug block w-full">
            {trip.driver?.name?.split(" ")[0] ?? "—"}
          </span>
        </div>
        {!compact && trip.order && (
          <div className="text-[8px] text-muted-foreground truncate leading-snug block">
            {trip.order.origin} → {trip.order.destination}
          </div>
        )}
      </div>
    </button>
  );
}

export function DraggableTripCard({
  trip,
  onClick,
  compact,
}: {
  trip: TripWithRelations;
  onClick: () => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: trip.id,
      data: { trip },
      disabled: trip.status === "finalizata" || trip.status === "anulata",
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <TripCard
        trip={trip}
        isDragging={isDragging}
        onClick={isDragging ? undefined : onClick}
        compact={compact}
      />
    </div>
  );
}

export function SidebarTripCard({
  trip,
  onClick,
}: {
  trip: TripWithRelations;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: trip.id,
      data: { trip },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <button
        onClick={isDragging ? undefined : onClick}
        className={`w-full text-left rounded-lg border p-2 mb-1 transition-opacity flex items-start gap-2 group ${STATUS_BADGE[trip.status]} hover:opacity-80`}
      >
        <GripVertical className="h-4 w-4 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[trip.status]}`}
            />
            <span className="text-xs font-semibold truncate">
              {trip.driver?.name ?? "—"}
            </span>
          </div>
          {trip.order && (
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
              {trip.order.origin} → {trip.order.destination}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {trip.order?.clientName ?? trip.orderId}
          </div>
        </div>
      </button>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
