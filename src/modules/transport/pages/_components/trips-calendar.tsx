import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

function padTwo(n: number) {
  return n < 10 ? "0" + n : String(n);
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  return result;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + n);
  return result;
}

const STATUS_CARD_CLASSES: Record<Trip["status"], string> = {
  planned:
    "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700",
  in_desfasurare:
    "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
  finalizata:
    "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700",
  anulata: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700",
};

const STATUS_DOT_CLASSES: Record<Trip["status"], string> = {
  planned: "bg-blue-500",
  in_desfasurare: "bg-amber-500",
  finalizata: "bg-green-500",
  anulata: "bg-red-500",
};

type TripWithRelations = Trip & {
  order?: Order;
  driver?: Driver;
  truck?: Truck;
};

function useData() {
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);

  React.useEffect(() => {
    setTrips(getCollection<Trip>(STORAGE_KEYS.trips));
    setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  const enriched: TripWithRelations[] = trips.map((trip) => ({
    ...trip,
    order: orders.find((o) => o.id === trip.orderId),
    driver: drivers.find((d) => d.id === trip.driverId),
    truck: trucks.find((tr) => tr.id === trip.truckId),
  }));

  return { enriched };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function TripDetailDialog({
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
        <div className="space-y-2.5 text-sm">
          <Row
            label={t("trips.fields.order")}
            value={trip.order?.clientName ?? trip.orderId}
          />
          {trip.order && (
            <Row
              label={t("trips.columns.route")}
              value={`${trip.order.origin} → ${trip.order.destination}`}
            />
          )}
          <Row
            label={t("trips.fields.driver")}
            value={trip.driver?.name ?? "—"}
          />
          <Row
            label={t("trips.fields.truck")}
            value={
              trip.truck
                ? `${trip.truck.plateNumber} · ${trip.truck.brand} ${trip.truck.model}`
                : "—"
            }
          />
          <Row
            label={t("trips.fields.departureDate")}
            value={trip.departureDate}
          />
          <Row
            label={t("trips.fields.arrivalDate")}
            value={trip.estimatedArrivalDate}
          />
          <Row
            label={t("trips.fields.kmLoaded")}
            value={`${trip.kmLoaded.toLocaleString()} km`}
          />
          <Row
            label={t("trips.fields.kmEmpty")}
            value={`${trip.kmEmpty.toLocaleString()} km`}
          />
          <Row
            label={t("trips.fields.fuelCost")}
            value={`${trip.fuelCost.toLocaleString()} RON`}
          />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">
              {t("trips.fields.status")}
            </span>
            <span
              className={`font-medium text-right ${
                trip.status === "anulata"
                  ? "text-red-600 dark:text-red-400"
                  : trip.status === "finalizata"
                    ? "text-green-600 dark:text-green-400"
                    : trip.status === "in_desfasurare"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {t(`trips.status.${trip.status}`)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeekCalendar({
  enriched,
  t,
}: {
  enriched: TripWithRelations[];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [selectedTrip, setSelectedTrip] =
    React.useState<TripWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);
  const today = toYMD(new Date());

  const DAY_NAMES = t("tripsCalendar.dayNames", {
    returnObjects: true,
  }) as string[];
  const MONTH_NAMES = t("dashboard.months", {
    returnObjects: true,
  }) as string[];

  function formatWeekRange() {
    const s = weekStart;
    const e = weekEnd;
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${s.getFullYear()}`;
  }

  function tripsForDay(ymd: string) {
    return enriched.filter((trip) => {
      const dep = (trip.departureDate ?? "").slice(0, 10);
      const arr = (trip.estimatedArrivalDate ?? "").slice(0, 10);
      return dep <= ymd && arr >= ymd;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 px-2"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">
            {t("tripsCalendar.prevWeek")}
          </span>
        </Button>

        <span className="text-xs sm:text-sm font-medium text-center leading-tight">
          {formatWeekRange()}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 px-2"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
        >
          <span className="hidden sm:inline mr-1">
            {t("tripsCalendar.nextWeek")}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "4px",
        }}
      >
        {days.map((day, i) => {
          const ymd = toYMD(day);
          const isToday = ymd === today;
          const dayTrips = tripsForDay(ymd);
          return (
            <div
              key={ymd}
              className={`min-h-[110px] sm:min-h-[140px] rounded-lg border p-1 sm:p-1.5 flex flex-col min-w-0 overflow-hidden ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="text-center mb-1">
                <div
                  className={`text-[9px] sm:text-[11px] uppercase leading-none ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {DAY_NAMES[i]}
                </div>
                <div
                  className={`text-[11px] sm:text-sm font-semibold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto mt-0.5 ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </div>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                {dayTrips.length === 0 ? (
                  <div className="text-[9px] text-muted-foreground text-center mt-1">
                    —
                  </div>
                ) : (
                  dayTrips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setDialogOpen(true);
                      }}
                      className={`w-full text-left rounded border p-0.5 sm:p-1 mb-0.5 hover:opacity-80 transition-opacity ${STATUS_CARD_CLASSES[trip.status]}`}
                    >
                      <div className="flex items-center gap-0.5 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT_CLASSES[trip.status]}`}
                        />
                        <span className="text-[9px] sm:text-[11px] font-medium truncate leading-snug block w-full">
                          {trip.driver?.name?.split(" ")[0] ?? "—"}
                        </span>
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-muted-foreground truncate leading-snug block">
                        {t(`trips.status.${trip.status}`)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t">
        {(
          [
            "planned",
            "in_desfasurare",
            "finalizata",
            "anulata",
          ] as Trip["status"][]
        ).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT_CLASSES[s]}`}
            />
            {t(`trips.status.${s}`)}
          </span>
        ))}
      </div>

      <TripDetailDialog
        trip={selectedTrip}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTrip(null);
        }}
        t={t}
      />
    </div>
  );
}

export default function TripsCalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enriched } = useData();

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trips.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 mb-4">
              <CardTitle className="text-base md:text-lg">
                {t("tripsCalendar.title")}
              </CardTitle>
              <Tabs
                defaultValue="calendar"
                onValueChange={(v) => {
                  if (v === "table") navigate({ to: "/transport/trips" });
                }}
              >
                <TabsList>
                  <TabsTrigger value="table">
                    {t("tripsCalendar.tabs.table")}
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    {t("tripsCalendar.tabs.calendar")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <WeekCalendar enriched={enriched} t={t} />
          </CardHeader>
        </Card>
      </Main>
    </>
  );
}
