// ──────────────────────────────────────────────────────────
// A30. Profil Sofer Detaliat
// Ruta: /transport/drivers/:driverId
// Tab-uri: Info, Curse, Statistici, Documente
// Responsive: useMobile(640)
// i18n: useTranslation
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, Truck, User, AlertTriangle, CheckCircle2, Clock, XCircle, BarChart3, FileText, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Driver, Trip, Truck as TruckType, Order } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Status helpers ─────────────────────────────────────────

const DRIVER_STATUS_CLASS: Record<Driver["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  off_duty: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const TRIP_STATUS_ICON: Record<Trip["status"], React.ReactNode> = {
  planned: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  in_desfasurare: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  finalizata: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  anulata: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

// ── Avatar ─────────────────────────────────────────────────

function DriverAvatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-pink-500"];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full font-bold text-white shrink-0",
      colors[colorIdx],
      size === "lg" ? "h-20 w-20 text-2xl" : "h-8 w-8 text-xs",
    )}>
      {getInitials(name)}
    </div>
  );
}

// ── Tab: Info ──────────────────────────────────────────────

function TabInfo({ driver, truck }: { driver: Driver; truck?: TruckType }) {
  const { t } = useTranslation();
  const days = daysUntil(driver.licenseExpiry);
  const licenseExpiring = days <= 30;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("driverProfile.info.personal")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{driver.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t("driverProfile.info.status")}: </span>
            <Badge variant="outline" className={DRIVER_STATUS_CLASS[driver.status]}>
              {t(`drivers.status.${driver.status}`)}
            </Badge>
          </div>
          {truck && (
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{truck.plateNumber} — {truck.brand} {truck.model} ({truck.year})</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("driverProfile.info.license")}</CardTitle></CardHeader>
        <CardContent>
          <div className={cn("flex items-center gap-2 text-sm", licenseExpiring && "text-yellow-700 dark:text-yellow-400 font-semibold")}>
            {licenseExpiring && <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{t("driverProfile.info.licenseExpiry")}: {formatDateRO(driver.licenseExpiry)}</span>
            {licenseExpiring && (
              <span className="text-xs">
                ({days <= 0
                  ? t("driverProfile.info.licenseExpired")
                  : t("driverProfile.info.licenseExpiresIn", { days })})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {truck && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("driverProfile.info.truckDocs")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "ITP", date: truck.itpExpiry },
              { label: "RCA", date: truck.rcaExpiry },
              { label: t("driverProfile.info.vignette"), date: truck.vignetteExpiry },
            ].map(({ label, date }) => {
              const d = daysUntil(date);
              const expiring = d <= 30;
              return (
                <div key={label} className={cn("flex justify-between text-sm", expiring && "text-yellow-700 dark:text-yellow-400 font-medium")}>
                  <span className="flex items-center gap-1">
                    {expiring && <AlertTriangle className="h-3.5 w-3.5" />}
                    {label}
                  </span>
                  <span>{formatDateRO(date)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Curse ─────────────────────────────────────────────

function TabTrips({ trips, orders, isMobile }: {
  trips: Trip[];
  orders: Order[];
  isMobile: boolean;
}) {
  const { t } = useTranslation();

  if (trips.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("driverProfile.trips.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      {trips.map((trip) => {
        const order = orders.find((o) => o.id === trip.orderId);
        return (
          <Card key={trip.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{order?.clientName ?? trip.orderId}</p>
                  {order && (
                    <p className="text-xs text-muted-foreground truncate">
                      {order.origin} → {order.destination}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {TRIP_STATUS_ICON[trip.status]}
                  <span className="text-xs text-muted-foreground">{t(`trips.status.${trip.status}`)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className={cn("grid gap-x-4 gap-y-1 text-xs text-muted-foreground", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                <span>{t("driverProfile.trips.departure")}: <span className="text-foreground">{trip.departureDate}</span></span>
                <span>{t("driverProfile.trips.kmLoaded")}: <span className="text-foreground">{trip.kmLoaded} km</span></span>
                <span>{t("driverProfile.trips.kmEmpty")}: <span className="text-foreground">{trip.kmEmpty} km</span></span>
                <span>{t("driverProfile.trips.fuelCost")}: <span className="text-foreground">{trip.fuelCost} RON</span></span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Tab: Statistici ────────────────────────────────────────

function TabStats({ trips, isMobile }: { trips: Trip[]; isMobile: boolean }) {
  const { t } = useTranslation();

  const totalKm = trips.reduce((s, tr) => s + tr.kmLoaded + tr.kmEmpty, 0);
  const totalFuel = trips.reduce((s, tr) => s + tr.fuelCost, 0);
  const finalizate = trips.filter((tr) => tr.status === "finalizata").length;
  const rataFinalizare = trips.length > 0 ? Math.round((finalizate / trips.length) * 100) : 0;

  const kmPerMonth: Record<string, number> = {};
  for (const trip of trips) {
    const month = trip.departureDate.slice(0, 7);
    kmPerMonth[month] = (kmPerMonth[month] ?? 0) + trip.kmLoaded + trip.kmEmpty;
  }
  const chartData = Object.entries(kmPerMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, km]) => ({
      luna: format(parseISO(`${month}-01`), "MMM yy", { locale: ro }),
      km,
    }));

  const statCards = [
    { label: t("driverProfile.stats.totalKm"), value: `${totalKm.toLocaleString("ro-RO")} km` },
    { label: t("driverProfile.stats.totalTrips"), value: trips.length },
    { label: t("driverProfile.stats.finishRate"), value: `${rataFinalizare}%` },
    { label: t("driverProfile.stats.totalFuel"), value: `${totalFuel.toLocaleString("ro-RO")} RON` },
  ];

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4")}>
        {statCards.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("driverProfile.stats.kmPerMonth")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="luna" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(val) => [`${(val as number).toLocaleString("ro-RO")} km`, "Km"]} />
                <Bar dataKey="km" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Documente ─────────────────────────────────────────

function TabDocuments({ driver }: { driver: Driver }) {
  const { t } = useTranslation();
  const days = daysUntil(driver.licenseExpiry);
  const expired = days <= 0;
  const expiring = days > 0 && days <= 30;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("driverProfile.docs.license")}</CardTitle></CardHeader>
        <CardContent>
          <div className={cn(
            "flex items-center justify-between text-sm rounded-lg border p-3",
            expired ? "border-red-300 bg-red-50 dark:bg-red-950" :
            expiring ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950" :
            "border-green-300 bg-green-50 dark:bg-green-950",
          )}>
            <div>
              <p className="font-medium">{t("driverProfile.docs.licenseCategory")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("driverProfile.docs.expiry")}: {formatDateRO(driver.licenseExpiry)}
              </p>
            </div>
            <Badge variant="outline" className={
              expired ? "bg-red-100 text-red-800 border-red-300" :
              expiring ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
              "bg-green-100 text-green-800 border-green-300"
            }>
              {expired
                ? t("driverProfile.docs.expired")
                : expiring
                ? `${days} ${t("driverProfile.docs.days")}`
                : t("driverProfile.docs.valid")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("driverProfile.docs.uploadTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("driverProfile.docs.uploadHint")}</p>
            <Button variant="outline" size="sm" disabled>
              {t("driverProfile.docs.uploadBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Pagina principala ──────────────────────────────────────

export default function DriverProfilePage() {
  const { t } = useTranslation();
  const { driverId } = useParams({ strict: false }) as { driverId: string };
  const navigate = useNavigate();
  const isMobile = useMobile(640);

  const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
  const driver = drivers.find((d) => d.id === driverId);

  const trips = React.useMemo(
    () => getCollection<Trip>(STORAGE_KEYS.trips).filter((tr) => tr.driverId === driverId),
    [driverId],
  );
  const orders = React.useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);
  const truck = React.useMemo(() => {
    if (!driver?.truckId) return undefined;
    return getCollection<TruckType>(STORAGE_KEYS.trucks).find((tr) => tr.id === driver.truckId);
  }, [driver]);

  if (!driver) {
    return (
      <>
        <Header>
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/transport/drivers" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">{t("driverProfile.notFound")}</h1>
        </Header>
        <Main>
          <p className="text-center text-muted-foreground py-20">{t("driverProfile.notFoundDesc")}</p>
        </Main>
      </>
    );
  }

  const tabs = [
    { value: "info", label: t("driverProfile.tabs.info"), icon: <Info className="h-3.5 w-3.5" /> },
    { value: "trips", label: t("driverProfile.tabs.trips"), icon: <Truck className="h-3.5 w-3.5" /> },
    { value: "stats", label: t("driverProfile.tabs.stats"), icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { value: "docs", label: t("driverProfile.tabs.docs"), icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <Header>
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/transport/drivers" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">{driver.name}</h1>
      </Header>

      <Main>
        {/* Hero card */}
        <Card className="mb-6">
          <CardContent className={cn("pt-6", isMobile ? "flex flex-col items-center text-center gap-3" : "flex items-center gap-6")}>
            <DriverAvatar name={driver.name} size="lg" />
            <div className={cn("min-w-0", isMobile && "w-full")}>
              <h2 className="text-xl font-bold">{driver.name}</h2>
              <p className="text-muted-foreground text-sm">{driver.phone}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center md:justify-start">
                <Badge variant="outline" className={DRIVER_STATUS_CLASS[driver.status]}>
                  {t(`drivers.status.${driver.status}`)}
                </Badge>
                {truck && (
                  <Badge variant="secondary">
                    <Truck className="mr-1 h-3 w-3" />
                    {truck.plateNumber}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab-uri */}
        <Tabs defaultValue="info">
          <TabsList className={cn("mb-4", isMobile ? "grid grid-cols-4 w-full h-auto p-1" : "")}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "gap-1",
                  isMobile && "flex flex-col items-center justify-center text-[10px] h-12 px-0.5 py-1 min-w-0 w-full"
                )}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className={cn(isMobile && "truncate max-w-full text-center leading-none")}>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="info">
            <TabInfo driver={driver} truck={truck} />
          </TabsContent>

          <TabsContent value="trips">
            <TabTrips trips={trips} orders={orders} isMobile={isMobile} />
          </TabsContent>

          <TabsContent value="stats">
            <TabStats trips={trips} isMobile={isMobile} />
          </TabsContent>

          <TabsContent value="docs">
            <TabDocuments driver={driver} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}