import { useDroppable } from "@dnd-kit/core";

import { DraggableTripCard } from "./trips-dnd-cards";
import type { TripWithRelations } from "./trips-dnd-types";

export function DroppableDay({
  ymd,
  isToday,
  isCurrentMonth,
  day,
  dayName,
  trips,
  onTripClick,
  compact,
}: {
  ymd: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  day: number;
  dayName: string;
  trips: TripWithRelations[];
  onTripClick: (trip: TripWithRelations) => void;
  compact?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ymd });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border flex flex-col transition-colors overflow-hidden
        ${compact ? "min-h-[72px] p-0.5" : "min-h-[90px] p-1"}
        ${isOver ? "bg-primary/10 border-primary/50" : ""}
        ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}
        ${!isCurrentMonth ? "opacity-35" : ""}
      `}
    >
      <div className="text-center mb-0.5">
        <div
          className={`text-[8px] uppercase leading-none ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}
        >
          {dayName}
        </div>
        <div
          className={`text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center mx-auto mt-0.5 ${isToday ? "bg-primary text-primary-foreground" : ""}`}
        >
          {day}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {trips.length === 0 ? (
          <div className="text-[8px] text-muted-foreground text-center mt-1 select-none">
            —
          </div>
        ) : (
          trips.map((trip) => (
            <DraggableTripCard
              key={trip.id}
              trip={trip}
              onClick={() => onTripClick(trip)}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  );
}
