import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import { getCollection, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useAuditLog } from "@/hooks/use-audit-log";

import {
  toYMD,
  startOfMonth,
  getDaysInMonth,
  getDayOfWeek,
  addDays,
} from "./_components/trips-calendar-utils";
import { STATUS_DOT } from "./_components/trips-dnd-types";
import type { TripWithRelations } from "./_components/trips-dnd-types";
import { TripCard, SidebarTripCard } from "./_components/trips-dnd-cards";
import { DroppableDay } from "./_components/trips-dnd-droppable-day";
import { TripDetailDialog, ConfirmMoveDialog } from "./_components/trips-dnd-dialogs";

function useWindowWidth() {
  const [w, setW] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useData() {
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);

  const load = React.useCallback(() => {
    setTrips(getCollection<Trip>(STORAGE_KEYS.trips));
    setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const enriched: TripWithRelations[] = trips.map((trip) => ({
    ...trip,
    order: orders.find((o) => o.id === trip.orderId),
    driver: drivers.find((d) => d.id === trip.driverId),
    truck: trucks.find((tr) => tr.id === trip.truckId),
  }));

  return { enriched, reload: load };
}

export default function TripsCalendarDndPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const { enriched, reload } = useData();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [selectedTrip, setSelectedTrip] =
    React.useState<TripWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [activeTrip, setActiveTrip] = React.useState<TripWithRelations | null>(
    null,
  );
  const [pendingMove, setPendingMove] = React.useState<{
    trip: TripWithRelations;
    newDate: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [unscheduledOpen, setUnscheduledOpen] = React.useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const DAY_NAMES = t("tripsCalendar.dayNames", {
    returnObjects: true,
  }) as string[];
  const DAY_NAMES_SHORT = DAY_NAMES.map((n) => n.slice(0, 1));
  const MONTH_NAMES = t("dashboard.months", {
    returnObjects: true,
  }) as string[];

  const today = toYMD(new Date());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = startOfMonth(currentDate);
  const startOffset = getDayOfWeek(firstDay);

  const unscheduled = React.useMemo(
    () =>
      enriched.filter(
        (tr) =>
          !tr.departureDate &&
          tr.status !== "finalizata" &&
          tr.status !== "anulata",
      ),
    [enriched],
  );

  function tripsForDay(ymd: string) {
    return enriched.filter((trip) => {
      if (!trip.departureDate) return false;
      const dep = trip.departureDate.slice(0, 10);
      const arr = (trip.estimatedArrivalDate ?? dep).slice(0, 10);
      return dep <= ymd && arr >= ymd;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const trip = event.active.data.current?.trip as
      | TripWithRelations
      | undefined;
    setActiveTrip(trip ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTrip(null);
    const { over, active } = event;
    if (!over) return;
    const trip = active.data.current?.trip as TripWithRelations | undefined;
    if (!trip) return;
    const newDate = String(over.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    if (trip.departureDate?.slice(0, 10) === newDate) return;
    setPendingMove({ trip, newDate });
    setConfirmOpen(true);
  }

  function handleConfirmMove() {
    if (!pendingMove) return;
    const { trip, newDate } = pendingMove;
    const depDate = new Date(newDate);
    const arrDate = trip.estimatedArrivalDate
      ? new Date(trip.estimatedArrivalDate)
      : new Date(newDate);
    const depOld = trip.departureDate
      ? new Date(trip.departureDate)
      : new Date(newDate);
    const diffMs = arrDate.getTime() - depOld.getTime();
    const newArr = toYMD(new Date(depDate.getTime() + diffMs));
    updateItem<Trip>(
      STORAGE_KEYS.trips,
      (tr) => tr.id === trip.id,
      (tr) => ({ ...tr, departureDate: newDate, estimatedArrivalDate: newArr }),
    );
    log({
      action: "update",
      entity: "trip",
      entityId: trip.id,
      entityLabel: trip.order?.clientName ?? trip.id,
      detailKey: "activityLog.details.tripDateMoved",
      detailParams: { from: trip.departureDate ?? "-", to: newDate },
    });
    toast.success(t("tripsDnd.toast.moved"));
    setConfirmOpen(false);
    setPendingMove(null);
    reload();
  }

  function handleCancelMove() {
    setConfirmOpen(false);
    setPendingMove(null);
  }

  const calendarDays: Array<{
    ymd: string;
    day: number;
    isCurrentMonth: boolean;
  }> = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - (startOffset - i));
    calendarDays.push({
      ymd: toYMD(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    calendarDays.push({ ymd: toYMD(date), day: d, isCurrentMonth: true });
  }
  while (calendarDays.length % 7 !== 0) {
    const last = calendarDays[calendarDays.length - 1];
    const next = addDays(new Date(last.ymd), 1);
    calendarDays.push({
      ymd: toYMD(next),
      day: next.getDate(),
      isCurrentMonth: false,
    });
  }

  const dayNamesToUse = isMobile ? DAY_NAMES_SHORT : DAY_NAMES;

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trips.title")}</h1>
      </Header>

      <Main>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            <Card className="flex-1 min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <CardTitle className="text-base md:text-lg">
                    {t("tripsDnd.title")}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tabs
                      defaultValue="dnd"
                      onValueChange={(v) => {
                        if (v === "table") navigate({ to: "/transport/trips" });
                        if (v === "calendar")
                          navigate({ to: "/transport/trips-calendar" });
                        if (v === "map")
                          navigate({ to: "/transport/trips-map" });
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
                    {isMobile && unscheduled.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 gap-1 text-xs"
                        onClick={() => setUnscheduledOpen((v) => !v)}
                      >
                        <List className="h-3.5 w-3.5" />
                        {t("tripsDnd.sidebar.title")}
                        <span className="bg-primary text-primary-foreground rounded-full text-[10px] h-4 w-4 flex items-center justify-center font-bold">
                          {unscheduled.length}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-2"
                      onClick={() =>
                        setCurrentDate(
                          (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-2"
                      onClick={() =>
                        setCurrentDate(
                          (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap ml-1">
                      {MONTH_NAMES[month]} {year}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="flex items-center gap-1.5"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("tripsDnd.today")}
                  </Button>
                </div>

                {isMobile && unscheduled.length > 0 && unscheduledOpen && (
                  <div className="mb-3 rounded-lg border border-dashed border-border p-2">
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">
                      {t("tripsDnd.sidebar.hint")}
                    </p>
                    <div className="flex flex-col gap-1">
                      {unscheduled.map((trip) => (
                        <SidebarTripCard
                          key={trip.id}
                          trip={trip}
                          onClick={() => {
                            setSelectedTrip(trip);
                            setDetailOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto touch-pan-x -mx-3 sm:mx-0 px-3 sm:px-0 pb-2">
                  <div style={{ minWidth: "600px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: "2px",
                        marginBottom: "2px",
                      }}
                    >
                      {dayNamesToUse.map((name, i) => (
                        <div
                          key={i}
                          className="text-center text-[9px] sm:text-[10px] uppercase text-muted-foreground font-medium py-1"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: "2px",
                      }}
                    >
                      {calendarDays.map(({ ymd, day, isCurrentMonth }, i) => (
                        <DroppableDay
                          key={ymd}
                          ymd={ymd}
                          isToday={ymd === today}
                          isCurrentMonth={isCurrentMonth}
                          day={day}
                          dayName={dayNamesToUse[i % 7]}
                          trips={tripsForDay(ymd)}
                          compact={isMobile}
                          onTripClick={(trip) => {
                            setSelectedTrip(trip);
                            setDetailOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground pt-2 mt-1 border-t">
                  {(
                    [
                      "planned",
                      "in_desfasurare",
                      "finalizata",
                      "anulata",
                    ] as Trip["status"][]
                  ).map((s) => (
                    <span key={s} className="flex items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[s]}`}
                      />
                      {t(`trips.status.${s}`)}
                    </span>
                  ))}
                </div>
              </CardHeader>
            </Card>

            <div className="w-56 shrink-0 hidden md:flex flex-col gap-2">
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {t("tripsDnd.sidebar.title")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t("tripsDnd.sidebar.hint")}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pb-3 pt-0">
                  <ScrollArea className="h-full">
                    {unscheduled.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center mt-4">
                        {t("tripsDnd.sidebar.empty")}
                      </div>
                    ) : (
                      unscheduled.map((trip) => (
                        <SidebarTripCard
                          key={trip.id}
                          trip={trip}
                          onClick={() => {
                            setSelectedTrip(trip);
                            setDetailOpen(true);
                          }}
                        />
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          <DragOverlay>
            {activeTrip ? (
              <div className="pointer-events-none opacity-90 w-28">
                <TripCard trip={activeTrip} compact={isMobile} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Main>

      <TripDetailDialog
        trip={selectedTrip}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTrip(null);
        }}
        t={t}
      />

      <ConfirmMoveDialog
        open={confirmOpen}
        trip={pendingMove?.trip ?? null}
        newDate={pendingMove?.newDate ?? ""}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
        t={t}
      />
    </>
  );
}
