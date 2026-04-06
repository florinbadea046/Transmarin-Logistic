// ──────────────────────────────────────────────────────────
// A33. Rapoarte Avansate Transport
// Ruta: /reports/transport (inlocuieste pagina placeholder)
// DateRangePicker + filtre sofer/camion
// Grafice Recharts: BarChart, LineChart, PieChart, RadialBarChart
// Card-uri sumar: total km, cost mediu/cursa, nr. curse finalizate
// Export PDF complet cu jsPDF + autoTable
// Responsive: useMobile(640)
// i18n: useTranslation, fara diacritice in cod
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ro } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarIcon, Download, Loader2, Route, Truck, User, TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Trip, Driver, Truck as TruckType, Order } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";

// ── Culori ─────────────────────────────────────────────────

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ── Helpers ────────────────────────────────────────────────

function stripDiacritics(str: string): string {
  return str
    .replace(/[ăĂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "i" ? "i" : "I")
    .replace(/[șŞşŠ]/g, (c) => (c.toLowerCase() === "s" || c === "s") ? "s" : "S")
    .replace(/[țŢţŤ]/g, (c) => (c.toLowerCase() === "t" || c === "t") ? "t" : "T");
}

// ── Filtrare date ──────────────────────────────────────────

function filterTrips(
  trips: Trip[],
  range: DateRange | undefined,
  driverId: string,
  truckId: string,
): Trip[] {
  return trips.filter((tr) => {
    if (driverId !== "all" && tr.driverId !== driverId) return false;
    if (truckId !== "all" && tr.truckId !== truckId) return false;
    if (!range?.from) return true;
    try {
      return isWithinInterval(parseISO(tr.departureDate), {
        start: startOfDay(range.from),
        end: endOfDay(range.to ?? range.from),
      });
    } catch { return false; }
  });
}

// ── Builders ───────────────────────────────────────────────

function buildKmPerDriver(trips: Trip[], drivers: Driver[]) {
  const map: Record<string, number> = {};
  for (const tr of trips) map[tr.driverId] = (map[tr.driverId] ?? 0) + tr.kmLoaded + tr.kmEmpty;
  return Object.entries(map)
    .map(([id, km]) => ({ name: drivers.find((d) => d.id === id)?.name ?? id, km }))
    .sort((a, b) => b.km - a.km);
}

function buildFuelPerMonth(trips: Trip[], t: TFunction) {
  const map: Record<string, number> = {};
  for (const tr of trips) {
    const m = tr.departureDate.slice(0, 7);
    map[m] = (map[m] ?? 0) + tr.fuelCost;
  }
  const months = t("dashboard.months", { returnObjects: true }) as string[];
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, cost]) => {
      const [, month] = m.split("-");
      return { luna: `${months[parseInt(month) - 1]} ${m.slice(0, 4)}`, cost: Math.round(cost) };
    });
}

function buildTopRoutes(trips: Trip[], orders: Order[]) {
  const map: Record<string, number> = {};
  for (const tr of trips) {
    const order = orders.find((o) => o.id === tr.orderId);
    if (!order) continue;
    const key = `${order.origin} - ${order.destination}`;
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([ruta, count]) => ({ ruta, count }));
}

function buildTruckUtil(trips: Trip[], trucks: TruckType[]) {
  const total = trips.length || 1;
  const map: Record<string, number> = {};
  for (const tr of trips) map[tr.truckId] = (map[tr.truckId] ?? 0) + 1;
  return trucks.map((truck, i) => ({
    name: truck.plateNumber,
    utilizare: Math.round(((map[truck.id] ?? 0) / total) * 100),
    fill: COLORS[i % COLORS.length],
  }));
}

// ── KPI cards ──────────────────────────────────────────────

function buildKPIs(trips: Trip[], t: TFunction) {
  const finalizate = trips.filter((tr) => tr.status === "finalizata");
  const totalKm = trips.reduce((s, tr) => s + tr.kmLoaded + tr.kmEmpty, 0);
  const totalFuel = trips.reduce((s, tr) => s + tr.fuelCost, 0);
  const avgCost = finalizate.length > 0 ? Math.round(totalFuel / finalizate.length) : 0;

  return [
    {
      label: t("transportReports.kpi.totalKm"),
      value: `${totalKm.toLocaleString("ro-RO")} km`,
      icon: <Route className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: t("transportReports.kpi.avgCostPerTrip"),
      value: `${avgCost.toLocaleString("ro-RO")} RON`,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: t("transportReports.kpi.completedTrips"),
      value: finalizate.length,
      icon: <Truck className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: t("transportReports.kpi.totalFuel"),
      value: `${totalFuel.toLocaleString("ro-RO")} RON`,
      icon: <User className="h-4 w-4 text-muted-foreground" />,
    },
  ];
}

// ── Export PDF ─────────────────────────────────────────────

async function exportPDF(
  trips: Trip[],
  kmData: ReturnType<typeof buildKmPerDriver>,
  fuelData: ReturnType<typeof buildFuelPerMonth>,
  routeData: ReturnType<typeof buildTopRoutes>,
  utilData: ReturnType<typeof buildTruckUtil>,
  range: DateRange | undefined,
  chartRefs: Record<string, HTMLDivElement | null>,
  t: TFunction,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const imgW = pageW - margin * 2;

  const rangeLabel = range?.from
    ? `${format(range.from, "dd.MM.yyyy")}${range.to ? ` - ${format(range.to, "dd.MM.yyyy")}` : ""}`
    : t("transportReports.pdf.allData");

  // Header
  doc.setFontSize(16);
  doc.text(t("transportReports.pdf.title"), margin, 16);
  doc.setFontSize(10);
  doc.text(`${t("transportReports.pdf.interval")}: ${stripDiacritics(rangeLabel)}`, margin, 24);
  doc.text(`${t("transportReports.pdf.generated")}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, 30);

  // KPI summary
  const finalizate = trips.filter((tr) => tr.status === "finalizata").length;
  const totalKm = trips.reduce((s, tr) => s + tr.kmLoaded + tr.kmEmpty, 0);
  const totalFuel = trips.reduce((s, tr) => s + tr.fuelCost, 0);

  let y = 40;
  doc.setFontSize(11);
  doc.text(`${t("transportReports.kpi.totalKm")}: ${totalKm.toLocaleString("ro-RO")} km`, margin, y); y += 6;
  doc.text(`${t("transportReports.kpi.completedTrips")}: ${finalizate}`, margin, y); y += 6;
  doc.text(`${t("transportReports.kpi.totalFuel")}: ${totalFuel.toLocaleString("ro-RO")} RON`, margin, y); y += 10;

  // Grafice
  const charts: { ref: HTMLDivElement | null; title: string }[] = [
    { ref: chartRefs.km, title: t("transportReports.charts.kmPerDriver") },
    { ref: chartRefs.fuel, title: t("transportReports.charts.fuelPerMonth") },
    { ref: chartRefs.routes, title: t("transportReports.charts.topRoutes") },
    { ref: chartRefs.util, title: t("transportReports.charts.truckUtil") },
  ];

  for (const { ref, title } of charts) {
    if (!ref) continue;
    try {
      const canvas = await html2canvas(ref, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const imgH = imgW * (canvas.height / canvas.width);
      if (y + imgH + 14 > pageH - 10) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.text(stripDiacritics(title), margin, y);
      y += 5;
      doc.addImage(imgData, "PNG", margin, y, imgW, imgH);
      y += imgH + 10;
    } catch { /* html2canvas render failed — skip chart image */ }
  }

  // Tabele date
  doc.addPage(); y = 14;

  function addTable(title: string, head: string[], body: string[][]) {
    if (y + 30 > pageH - 10) { doc.addPage(); y = 14; }
    doc.setFontSize(11);
    doc.text(stripDiacritics(title), margin, y);
    y += 4;
    autoTable(doc, {
      startY: y, head: [head], body,
      styles: { fontSize: 9 }, headStyles: { fillColor: [30, 30, 30] },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (typeof data.cell.text[0] === "string")
          data.cell.text[0] = stripDiacritics(data.cell.text[0]);
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  addTable(t("transportReports.charts.kmPerDriver"),
    [t("transportReports.pdf.driver"), t("transportReports.pdf.totalKm")],
    kmData.map((r) => [stripDiacritics(r.name), `${r.km.toLocaleString("ro-RO")} km`]));

  addTable(t("transportReports.charts.fuelPerMonth"),
    [t("transportReports.pdf.month"), t("transportReports.pdf.cost")],
    fuelData.map((r) => [stripDiacritics(r.luna), `${r.cost.toLocaleString("ro-RO")} RON`]));

  addTable(t("transportReports.charts.topRoutes"),
    [t("transportReports.pdf.route"), t("transportReports.pdf.tripCount")],
    routeData.map((r) => [stripDiacritics(r.ruta), String(r.count)]));

  addTable(t("transportReports.charts.truckUtil"),
    [t("transportReports.pdf.truck"), t("transportReports.pdf.utilization")],
    utilData.map((r) => [r.name, `${r.utilizare}%`]));

  doc.save(`${t("transportReports.pdf.filename")}.pdf`);
}

// ── DateRangePicker ────────────────────────────────────────

function DateRangePicker({ value, onChange, isMobile }: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn(
          "justify-start text-left font-normal",
          isMobile ? "w-full" : "w-[260px]",
          !value && "text-muted-foreground",
        )}>
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value?.from
            ? value.to
              ? <>{format(value.from, "dd MMM yyyy", { locale: ro })} - {format(value.to, "dd MMM yyyy", { locale: ro })}</>
              : format(value.from, "dd MMM yyyy", { locale: ro })
            : t("transportReports.filters.selectInterval")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={isMobile ? 1 : 2} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// ── Empty ──────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}

// ── Pagina ─────────────────────────────────────────────────

export default function TransportReportsPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const { pathname } = useLocation();

  // Date
  const allTrips = React.useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const allOrders = React.useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);
  const drivers = React.useMemo(() => getCollection<Driver>(STORAGE_KEYS.drivers), []);
  const trucks = React.useMemo(() => getCollection<TruckType>(STORAGE_KEYS.trucks), []);

  // Filtre
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [driverId, setDriverId] = React.useState("all");
  const [truckId, setTruckId] = React.useState("all");
  const [exporting, setExporting] = React.useState(false);

  const chartRefs = React.useRef<Record<string, HTMLDivElement | null>>({
    km: null, fuel: null, routes: null, util: null,
  });

  // Date filtrate
  const trips = React.useMemo(
    () => filterTrips(allTrips, range, driverId, truckId),
    [allTrips, range, driverId, truckId],
  );

  const kmData = React.useMemo(() => buildKmPerDriver(trips, drivers), [trips, drivers]);
  const fuelData = React.useMemo(() => buildFuelPerMonth(trips, t), [trips, t]);
  const routeData = React.useMemo(() => buildTopRoutes(trips, allOrders), [trips, allOrders]);
  const utilData = React.useMemo(() => buildTruckUtil(trips, trucks), [trips, trucks]);
  const kpis = React.useMemo(() => buildKPIs(trips, t), [trips, t]);

  const chartH = isMobile ? 200 : 260;
  const xAxisProps = isMobile
    ? { tick: { fontSize: 10 }, interval: 0 }
    : { tick: { fontSize: 11 }, angle: -35, textAnchor: "end" as const, interval: 0 };

  const noData = <EmptyChart label={t("transportReports.noData")} />;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPDF(trips, kmData, fuelData, routeData, utilData, range, chartRefs.current, t);
    } finally {
      setExporting(false);
    }
  };

  const topNavLinks = [
    { title: t("sidebar.reports.transport"), href: "/reports/transport", isActive: pathname === "/reports/transport" || pathname === "/reports" },
    { title: t("sidebar.reports.financial"), href: "/reports/financial", isActive: pathname === "/reports/financial" },
    { title: t("sidebar.reports.fleet"), href: "/reports/fleet", isActive: pathname === "/reports/fleet" },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>
      <Main>
        {/* Titlu + Export */}
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "items-center justify-between")}>
          <div>
            <h1 className="text-xl font-bold">{t("transportReports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("transportReports.subtitle")}</p>
          </div>
          <Button size="sm" disabled={exporting} onClick={handleExport} className={isMobile ? "w-full" : ""}>
            {exporting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            {exporting ? t("transportReports.exporting") : t("transportReports.exportPdf")}
          </Button>
        </div>

        {/* Filtre */}
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "flex-wrap items-center")}>
          <DateRangePicker value={range} onChange={setRange} isMobile={isMobile} />

          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transportReports.filters.allDrivers")}</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={truckId} onValueChange={setTruckId}>
            <SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transportReports.filters.allTrucks")}</SelectItem>
              {trucks.map((tr) => (
                <SelectItem key={tr.id} value={tr.id}>{tr.plateNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(range || driverId !== "all" || truckId !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setRange(undefined); setDriverId("all"); setTruckId("all"); }}
              className={isMobile ? "w-full" : ""}>
              {t("transportReports.filters.reset")}
            </Button>
          )}

          <span className={cn("text-xs text-muted-foreground", !isMobile && "ml-auto")}>
            {t("transportReports.filters.tripCount", { count: trips.length })}
          </span>
        </div>

        {/* KPI Cards */}
        <div className={cn("mb-6 grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-4")}>
          {kpis.map(({ label, value, icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                {icon}
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-6" />

        {/* Grafice */}
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>

          {/* 1. Km per sofer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("transportReports.charts.kmPerDriver")}</CardTitle>
            </CardHeader>
            <CardContent>
              {kmData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.km = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <BarChart data={kmData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 40 : 50} />
                      <Tooltip formatter={(val) => [`${(val ?? 0).toLocaleString("ro-RO")} km`, t("transportReports.charts.kmPerDriver")]} />
                      <Bar dataKey="km" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Cost combustibil per luna */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("transportReports.charts.fuelPerMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.fuel = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <LineChart data={fuelData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="luna" {...xAxisProps} />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 40 : 50} />
                      <Tooltip formatter={(val) => [`${(val ?? 0).toLocaleString("ro-RO")} RON`, t("transportReports.charts.fuelPerMonth")]} />
                      <Line type="monotone" dataKey="cost" stroke={COLORS[1]} strokeWidth={2} dot={{ r: isMobile ? 3 : 4 }} activeDot={{ r: isMobile ? 5 : 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Top 5 rute */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("transportReports.charts.topRoutes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {routeData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.routes = el; }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 380}>
                    <PieChart>
                      <Pie
                        data={routeData} dataKey="count" nameKey="ruta"
                        cx="50%" cy={isMobile ? "40%" : "30%"}
                        outerRadius={isMobile ? 55 : 70}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {routeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val ?? 0, name ?? ""]} />
                      <Legend
                        iconSize={8} layout="vertical" align="center" verticalAlign="bottom"
                        wrapperStyle={{ fontSize: isMobile ? "10px" : "11px", lineHeight: "1.6", paddingTop: "8px", width: "100%", whiteSpace: "normal", wordBreak: "break-word" }}
                        formatter={(value) => (
                          <span style={{ display: "inline-block", maxWidth: isMobile ? "200px" : "280px", whiteSpace: "normal", wordBreak: "break-word", verticalAlign: "top" }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Utilizare camioane */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("transportReports.charts.truckUtil")}</CardTitle>
            </CardHeader>
            <CardContent>
              {utilData.every((d) => d.utilizare === 0) ? noData : (
                <div ref={(el) => { chartRefs.current.util = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <RadialBarChart innerRadius="20%" outerRadius="90%" data={utilData} startAngle={180} endAngle={0}>
                      <RadialBar
                        dataKey="utilizare"
                        label={{ position: "insideStart", fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                        background
                      />
                      <Tooltip formatter={(val) => [`${val ?? 0}%`, t("transportReports.charts.truckUtil")]} />
                      <Legend
                        iconSize={isMobile ? 8 : 10}
                        formatter={(value) => <span className={isMobile ? "text-[10px]" : "text-xs"}>{value}</span>}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </Main>
    </>
  );
}
