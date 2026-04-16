// A25. Rapoarte Avansate
// Filtrare DateRangePicker + grafice Recharts
// Export PDF cu diagrame via html2canvas
// Responsive: useMobile(640)
// i18n: useTranslation

import * as React from "react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ro } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function stripDiacritics(str: string): string {
  return str
    .replace(/[ăĂ]/g, (c) => c === "ă" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "â" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "î" ? "i" : "I")
    .replace(/[șŞşŠ]/g, (c) => (c.toLowerCase() === "ș" || c === "ş") ? "s" : "S")
    .replace(/[țŢţŤ]/g, (c) => (c.toLowerCase() === "ț" || c === "ţ") ? "t" : "T");
}

// ── DateRangePicker ────────────────────────────────────────

function DateRangePicker({ value, onChange, isMobile }: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", isMobile ? "w-full" : "w-[280px]", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value?.from ? (
            value.to
              ? <>{format(value.from, "dd MMM yyyy", { locale: ro })} - {format(value.to, "dd MMM yyyy", { locale: ro })}</>
              : format(value.from, "dd MMM yyyy", { locale: ro })
          ) : t("reports.selectInterval")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={isMobile ? 1 : 2} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// ── Procesare date ─────────────────────────────────────────

function filterTrips(trips: Trip[], range: DateRange | undefined): Trip[] {
  if (!range?.from) return trips;
  return trips.filter((t) => {
    try {
      return isWithinInterval(parseISO(t.departureDate), { start: startOfDay(range.from!), end: endOfDay(range.to ?? range.from!) });
    } catch { return false; }
  });
}

function filterOrders(orders: Order[], range: DateRange | undefined): Order[] {
  if (!range?.from) return orders;
  return orders.filter((o) => {
    try {
      return isWithinInterval(parseISO(o.date), { start: startOfDay(range.from!), end: endOfDay(range.to ?? range.from!) });
    } catch { return false; }
  });
}

function buildKmPerDriver(trips: Trip[], drivers: Driver[]) {
  const map: Record<string, number> = {};
  for (const trip of trips) map[trip.driverId] = (map[trip.driverId] ?? 0) + trip.kmLoaded + trip.kmEmpty;
  return Object.entries(map).map(([id, km]) => ({ name: drivers.find((d) => d.id === id)?.name ?? id, km })).sort((a, b) => b.km - a.km);
}

function buildFuelPerMonth(trips: Trip[]) {
  const map: Record<string, number> = {};
  for (const trip of trips) { const m = trip.departureDate.slice(0, 7); map[m] = (map[m] ?? 0) + trip.fuelCost; }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([m, cost]) => ({ luna: format(parseISO(`${m}-01`), "MMM yyyy", { locale: ro }), cost: Math.round(cost) }));
}

function buildTopRoutes(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) { const k = `${o.origin} - ${o.destination}`; map[k] = (map[k] ?? 0) + 1; }
  return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5).map(([ruta, count]) => ({ ruta, count }));
}

function buildTruckUtilization(trips: Trip[], trucks: Truck[]) {
  const total = trips.length || 1;
  const map: Record<string, number> = {};
  for (const trip of trips) map[trip.truckId] = (map[trip.truckId] ?? 0) + 1;
  return trucks.map((truck, i) => ({ name: truck.plateNumber, utilizare: Math.round(((map[truck.id] ?? 0) / total) * 100), fill: COLORS[i % COLORS.length] }));
}

// ── Export PDF ─────────────────────────────────────────────

async function exportPDF(
  kmData: ReturnType<typeof buildKmPerDriver>,
  fuelData: ReturnType<typeof buildFuelPerMonth>,
  routeData: ReturnType<typeof buildTopRoutes>,
  utilData: ReturnType<typeof buildTruckUtilization>,
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
    : t("reports.pdf.allData");

  doc.setFontSize(16);
  doc.text(t("reports.pdf.title"), margin, 16);
  doc.setFontSize(10);
  doc.text(`${t("reports.pdf.interval")}: ${stripDiacritics(rangeLabel)}`, margin, 24);
  doc.text(`${t("reports.pdf.generated")}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, 30);

  let y = 38;

  const charts: { ref: HTMLDivElement | null; title: string }[] = [
    { ref: chartRefs.km, title: t("reports.pdf.kmPerDriver") },
    { ref: chartRefs.fuel, title: t("reports.pdf.fuelPerMonth") },
    { ref: chartRefs.routes, title: t("reports.pdf.topRoutes") },
    { ref: chartRefs.util, title: t("reports.pdf.truckUtilization") },
  ];

  for (const { ref, title } of charts) {
    if (!ref) continue;
    try {
      const canvas = await html2canvas(ref, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const imgH = imgW * (canvas.height / canvas.width);
      if (y + imgH + 14 > pageH - 10) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.text(title, margin, y);
      y += 5;
      doc.addImage(imgData, "PNG", margin, y, imgW, imgH);
      y += imgH + 10;
    } catch { /* html2canvas render failed — skip chart image */ }
  }

  doc.addPage();
  y = 14;

  function addTable(title: string, head: string[], body: string[][]) {
    if (y + 30 > pageH - 10) { doc.addPage(); y = 14; }
    doc.setFontSize(11);
    doc.text(title, margin, y);
    y += 4;
    autoTable(doc, {
      startY: y, head: [head], body,
      styles: { fontSize: 9 }, headStyles: { fillColor: [30, 30, 30] },
      margin: { left: margin, right: margin },
      didParseCell: (data) => { if (typeof data.cell.text[0] === "string") data.cell.text[0] = stripDiacritics(data.cell.text[0]); },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  addTable(t("reports.pdf.kmPerDriver"), [t("reports.pdf.driver"), t("reports.pdf.totalKm")],
    kmData.map((r) => [stripDiacritics(r.name), r.km.toLocaleString("ro-RO")]));
  addTable(t("reports.pdf.fuelPerMonth"), [t("reports.pdf.month"), t("reports.pdf.cost")],
    fuelData.map((r) => [stripDiacritics(r.luna), r.cost.toLocaleString("ro-RO")]));
  addTable(t("reports.pdf.topRoutes"), [t("reports.pdf.route"), t("reports.pdf.orderCount")],
    routeData.map((r) => [stripDiacritics(r.ruta), String(r.count)]));
  addTable(t("reports.pdf.truckUtilization"), [t("reports.pdf.truck"), t("reports.pdf.utilization")],
    utilData.map((r) => [r.name, `${r.utilizare}%`]));

  doc.save(`${t("reports.pdf.filename")}.pdf`);
}

// ── Mesaj gol ──────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}

// ── Pagina principala ──────────────────────────────────────

export default function AdvancedReportsPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [exporting, setExporting] = React.useState(false);

  const chartRefs = React.useRef<Record<string, HTMLDivElement | null>>({ km: null, fuel: null, routes: null, util: null });

  const trips = React.useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const orders = React.useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);
  const drivers = React.useMemo(() => getCollection<Driver>(STORAGE_KEYS.drivers), []);
  const trucks = React.useMemo(() => getCollection<Truck>(STORAGE_KEYS.trucks), []);

  const filteredTrips = React.useMemo(() => filterTrips(trips, range), [trips, range]);
  const filteredOrders = React.useMemo(() => filterOrders(orders, range), [orders, range]);

  const kmData = React.useMemo(() => buildKmPerDriver(filteredTrips, drivers), [filteredTrips, drivers]);
  const fuelData = React.useMemo(() => buildFuelPerMonth(filteredTrips), [filteredTrips]);
  const routeData = React.useMemo(() => buildTopRoutes(filteredOrders), [filteredOrders]);
  const utilData = React.useMemo(() => buildTruckUtilization(filteredTrips, trucks), [filteredTrips, trucks]);

  const chartHeight = isMobile ? 200 : 260;
  const xAxisProps = isMobile
    ? { tick: { fontSize: 10 }, interval: 0 }
    : { tick: { fontSize: 11 }, angle: -35, textAnchor: "end" as const, interval: 0 };

  const handleExport = async () => {
    setExporting(true);
    try { await exportPDF(kmData, fuelData, routeData, utilData, range, chartRefs.current, t); }
    finally { setExporting(false); }
  };

  const noData = <EmptyChart label={t("reports.noData")} />;

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("reports.title")}</h1>
      </Header>

      <Main>
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "flex-wrap items-center justify-between")}>
          <DateRangePicker value={range} onChange={setRange} isMobile={isMobile} />
          <div className={cn("flex items-center gap-2", isMobile && "justify-between")}>
            {range && (
              <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>
                {t("reports.reset")}
              </Button>
            )}
            <Button size="sm" className={isMobile ? "flex-1" : ""} disabled={exporting} onClick={handleExport}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? t("reports.exporting") : t("reports.exportPdf")}
            </Button>
          </div>
        </div>

        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>

          {/* 1. Km per sofer */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">{t("reports.charts.kmPerDriver")}</CardTitle></CardHeader>
            <CardContent>
              {kmData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.km = el; }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={kmData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" {...xAxisProps} />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 40 : 50} />
                      <ChartTooltip formatter={(val) => [`${(val ?? 0).toLocaleString("ro-RO")} km`, t("reports.tooltip.km")]} />
                      <Bar dataKey="km" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Costuri combustibil pe luna */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">{t("reports.charts.fuelPerMonth")}</CardTitle></CardHeader>
            <CardContent>
              {fuelData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.fuel = el; }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <LineChart data={fuelData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="luna" {...xAxisProps} />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 40 : 50} />
                      <ChartTooltip formatter={(val) => [`${(val ?? 0).toLocaleString("ro-RO")} RON`, t("reports.tooltip.cost")]} />
                      <Line type="monotone" dataKey="cost" stroke={COLORS[1]} strokeWidth={2} dot={{ r: isMobile ? 3 : 4 }} activeDot={{ r: isMobile ? 5 : 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Top 5 rute frecvente */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">{t("reports.charts.topRoutes")}</CardTitle></CardHeader>
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
                      <ChartTooltip formatter={(val, name) => [val ?? 0, name ?? ""]} />
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

          {/* 4. Rata utilizare camioane */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">{t("reports.charts.truckUtilization")}</CardTitle></CardHeader>
            <CardContent>
              {utilData.every((d) => d.utilizare === 0) ? noData : (
                <div ref={(el) => { chartRefs.current.util = el; }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <RadialBarChart innerRadius="20%" outerRadius="90%" data={utilData} startAngle={180} endAngle={0}>
                      <RadialBar dataKey="utilizare" label={{ position: "insideStart", fill: "#fff", fontSize: isMobile ? 9 : 11 }} background />
                      <ChartTooltip formatter={(val) => [`${val ?? 0}%`, t("reports.tooltip.utilization")]} />
                      <Legend iconSize={isMobile ? 8 : 10} formatter={(value) => <span className={isMobile ? "text-[10px]" : "text-xs"}>{value}</span>} />
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