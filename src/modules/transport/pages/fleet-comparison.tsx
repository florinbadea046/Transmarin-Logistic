// A33. Comparatie Performanta Flota
// Ruta: /pages/fleet-comparison.tsx
// TanStack Table: camion, nr. curse, km total, consum L/100km, cost mentenanta, venit, profit net
// Checkbox select 2-3 camioane -> RadarChart comparativ
// Card "Camionul Lunii" (cel mai profitabil)
// Export Excel/PDF
// Responsive: useMobile(640)
// i18n: fara diacritice in cod

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { Trophy, Download, FileText } from "lucide-react";
import type { TFunction } from "i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck, Trip, MaintenanceRecord, FuelLog } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────

function stripD(s: string): string {
  return s
    .replace(/[ăĂ]/g, (c) => c === "ă" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "â" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "î" ? "i" : "I")
    .replace(/[șşŞŠ]/g, (c) => c.toLowerCase() === "s" || c === "ş" ? "s" : "S")
    .replace(/[țţŢŤ]/g, (c) => c.toLowerCase() === "t" || c === "ţ" ? "t" : "T");
}

// ── Tip date per camion ────────────────────────────────────

interface TruckStats {
  truck: Truck;
  tripCount: number;
  totalKm: number;
  avgConsumption: number;   // L/100km
  maintenanceCost: number;
  revenue: number;
  fuelCost: number;
  profit: number;
}

// ── Calcul statistici ──────────────────────────────────────

function buildStats(
  trucks: Truck[],
  trips: Trip[],
  maintenance: MaintenanceRecord[],
  fuelLogs: FuelLog[],
): TruckStats[] {
  return trucks.map((truck) => {
    const truckTrips = trips.filter((tr) => tr.truckId === truck.id);
    const tripCount = truckTrips.length;
    const totalKm = truckTrips.reduce((s, tr) => s + tr.kmLoaded + tr.kmEmpty, 0);
    const revenue = truckTrips.reduce((s, tr) => s + (tr.revenue ?? 0), 0);
    const fuelCost = truckTrips.reduce((s, tr) => s + tr.fuelCost, 0);

    const maintenanceCost = maintenance
      .filter((m) => m.truckId === truck.id)
      .reduce((s, m) => s + m.cost, 0);

    // Consum L/100km din fuelLogs
    const truckFuelLogs = fuelLogs
      .filter((f) => f.truckId === truck.id)
      .sort((a, b) => a.kmAtFueling - b.kmAtFueling);

    let avgConsumption = 0;
    if (truckFuelLogs.length >= 2) {
      const kmDiff = truckFuelLogs[truckFuelLogs.length - 1].kmAtFueling - truckFuelLogs[0].kmAtFueling;
      const totalLiters = truckFuelLogs.slice(1).reduce((s, f) => s + f.liters, 0);
      if (kmDiff > 0) avgConsumption = (totalLiters / kmDiff) * 100;
    }

    const profit = revenue - fuelCost - maintenanceCost;

    return { truck, tripCount, totalKm, avgConsumption, maintenanceCost, revenue, fuelCost, profit };
  });
}

// ── Camionul Lunii ─────────────────────────────────────────

function BestTruckCard({ stats: _stats }: { stats: TruckStats[] }) {
  const { t } = useTranslation();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const trucks = React.useMemo(() => getCollection<Truck>(STORAGE_KEYS.trucks), []);
  const trips = React.useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const maintenance = React.useMemo(() => getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance), []);
  const fuelLogs = React.useMemo(() => getCollection<FuelLog>(STORAGE_KEYS.fuelLog), []);

  const monthStats = buildStats(
    trucks,
    trips.filter((tr) => tr.departureDate.startsWith(thisMonth)),
    maintenance.filter((m) => m.entryDate.startsWith(thisMonth)),
    fuelLogs.filter((f) => f.date.startsWith(thisMonth)),
  ).filter((s) => s.tripCount > 0);

  if (monthStats.length === 0) return null;
  const best = monthStats.sort((a, b) => b.profit - a.profit)[0];

  return (
    <Card className="border-yellow-300 dark:border-yellow-700 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
          <Trophy className="h-4 w-4" />
          {t("fleetComparison.bestTruck.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-2xl font-bold">{best.truck.plateNumber}</p>
            <p className="text-sm text-muted-foreground">{best.truck.brand} {best.truck.model}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span><span className="text-muted-foreground">{t("fleetComparison.columns.profit")}:</span> <span className="font-semibold text-green-600 dark:text-green-400">{best.profit.toLocaleString("ro-RO")} RON</span></span>
            <span><span className="text-muted-foreground">{t("fleetComparison.columns.tripCount")}:</span> <span className="font-semibold">{best.tripCount}</span></span>
            <span><span className="text-muted-foreground">{t("fleetComparison.columns.totalKm")}:</span> <span className="font-semibold">{best.totalKm.toLocaleString("ro-RO")} km</span></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Radar Chart ────────────────────────────────────────────

const RADAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

function ComparisonRadar({ selected, stats }: {
  selected: string[];
  stats: TruckStats[];
}) {
  const { t } = useTranslation();
  if (selected.length < 2) return null;

  const selectedStats = stats.filter((s) => selected.includes(s.truck.id));

  // Normalizeaza valorile 0-100 pentru radar
  const maxKm = Math.max(...stats.map((s) => s.totalKm), 1);
  const maxProfit = Math.max(...stats.map((s) => Math.abs(s.profit)), 1);
  const maxMaint = Math.max(...stats.map((s) => s.maintenanceCost), 1);
  const maxTrips = Math.max(...stats.map((s) => s.tripCount), 1);
  const maxConsumption = Math.max(...stats.map((s) => s.avgConsumption), 1);

  const axes = [
    t("fleetComparison.radar.km"),
    t("fleetComparison.radar.profit"),
    t("fleetComparison.radar.maintenance"),
    t("fleetComparison.radar.trips"),
    t("fleetComparison.radar.consumption"),
  ];

  const chartData = axes.map((subject, i) => {
    const entry: Record<string, unknown> = { subject };
    selectedStats.forEach((s) => {
      let val = 0;
      if (i === 0) val = Math.round((s.totalKm / maxKm) * 100);
      if (i === 1) val = Math.round((Math.max(s.profit, 0) / maxProfit) * 100);
      if (i === 2) val = Math.round((1 - s.maintenanceCost / maxMaint) * 100); // inversat: mai mic = mai bine
      if (i === 3) val = Math.round((s.tripCount / maxTrips) * 100);
      if (i === 4) val = Math.round((1 - s.avgConsumption / maxConsumption) * 100); // inversat
      entry[s.truck.plateNumber] = Math.max(val, 0);
    });
    return entry;
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("fleetComparison.radar.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
            {selectedStats.map((s, i) => (
              <Radar
                key={s.truck.id}
                name={s.truck.plateNumber}
                dataKey={s.truck.plateNumber}
                stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                fillOpacity={0.15}
              />
            ))}
            <Legend />
            <ChartTooltip formatter={(val) => [`${val}%`]} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">{t("fleetComparison.radar.note")}</p>
      </CardContent>
    </Card>
  );
}

// ── Export PDF ─────────────────────────────────────────────

function exportPDF(stats: TruckStats[], t: TFunction) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Transmarin Logistic SRL", 14, 15);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(stripD(t("fleetComparison.title")), 14, 23);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, 14, 29);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 34,
    head: [[
      t("fleetComparison.columns.truck"),
      t("fleetComparison.columns.tripCount"),
      t("fleetComparison.columns.totalKm"),
      t("fleetComparison.columns.consumption"),
      t("fleetComparison.columns.maintenanceCost"),
      t("fleetComparison.columns.revenue"),
      t("fleetComparison.columns.profit"),
    ].map(stripD)],
    body: stats.map((s) => [
      s.truck.plateNumber,
      String(s.tripCount),
      `${s.totalKm.toLocaleString("ro-RO")} km`,
      s.avgConsumption > 0 ? `${s.avgConsumption.toFixed(1)} L/100km` : "—",
      `${s.maintenanceCost.toLocaleString("ro-RO")} RON`,
      `${s.revenue.toLocaleString("ro-RO")} RON`,
      `${s.profit.toLocaleString("ro-RO")} RON`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  doc.save(`${stripD(t("fleetComparison.export.filename"))}.pdf`);
}

// ── Export Excel ───────────────────────────────────────────

function exportExcel(stats: TruckStats[], t: TFunction) {
  const rows = stats.map((s) => ({
    [t("fleetComparison.columns.truck")]: s.truck.plateNumber,
    [t("fleetComparison.columns.tripCount")]: s.tripCount,
    [t("fleetComparison.columns.totalKm")]: s.totalKm,
    [t("fleetComparison.columns.consumption")]: s.avgConsumption > 0 ? parseFloat(s.avgConsumption.toFixed(1)) : 0,
    [t("fleetComparison.columns.maintenanceCost")]: s.maintenanceCost,
    [t("fleetComparison.columns.revenue")]: s.revenue,
    [t("fleetComparison.columns.profit")]: s.profit,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("fleetComparison.export.sheetName"));
  XLSX.writeFile(wb, `${t("fleetComparison.export.filename")}.xlsx`);
}

// ── Pagina ─────────────────────────────────────────────────

export default function FleetComparisonPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);

  const trucks = React.useMemo(() => getCollection<Truck>(STORAGE_KEYS.trucks), []);
  const trips = React.useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const maintenance = React.useMemo(() => getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance), []);
  const fuelLogs = React.useMemo(() => getCollection<FuelLog>(STORAGE_KEYS.fuelLog), []);

  const stats = React.useMemo(
    () => buildStats(trucks, trips, maintenance, fuelLogs),
    [trucks, trips, maintenance, fuelLogs],
  );

  const [selected, setSelected] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "profit", desc: true }]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const columns: ColumnDef<TruckStats>[] = React.useMemo(() => [
    {
      id: "select",
      enableSorting: false,
      header: () => <span className="text-xs text-muted-foreground">{t("fleetComparison.selectHint")}</span>,
      cell: ({ row }) => (
        <Checkbox
          checked={selected.includes(row.original.truck.id)}
          onCheckedChange={() => toggleSelect(row.original.truck.id)}
          disabled={!selected.includes(row.original.truck.id) && selected.length >= 3}
        />
      ),
    },
    {
      id: "truck",
      accessorFn: (row) => row.truck.plateNumber,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.truck")} />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.truck.plateNumber}</div>
          <div className="text-xs text-muted-foreground">{row.original.truck.brand} {row.original.truck.model}</div>
        </div>
      ),
    },
    {
      id: "tripCount",
      accessorFn: (row) => row.tripCount,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.tripCount")} />,
      cell: ({ row }) => <span>{row.original.tripCount}</span>,
    },
    {
      id: "totalKm",
      accessorFn: (row) => row.totalKm,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.totalKm")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.totalKm.toLocaleString("ro-RO")} km</span>,
    },
    {
      id: "avgConsumption",
      accessorFn: (row) => row.avgConsumption,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.consumption")} />,
      cell: ({ row }) => (
        <span>{row.original.avgConsumption > 0 ? `${row.original.avgConsumption.toFixed(1)} L/100km` : "—"}</span>
      ),
    },
    {
      id: "maintenanceCost",
      accessorFn: (row) => row.maintenanceCost,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.maintenanceCost")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.maintenanceCost.toLocaleString("ro-RO")} RON</span>,
    },
    {
      id: "revenue",
      accessorFn: (row) => row.revenue,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.revenue")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.revenue.toLocaleString("ro-RO")} RON</span>,
    },
    {
      id: "profit",
      accessorFn: (row) => row.profit,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleetComparison.columns.profit")} />,
      cell: ({ row }) => (
        <span className={cn(
          "font-semibold whitespace-nowrap",
          row.original.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
        )}>
          {row.original.profit.toLocaleString("ro-RO")} RON
        </span>
      ),
    },
  ], [selected, t]);

  const table = useReactTable({
    data: stats,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("fleetComparison.title")}</h1>
      </Header>
      <Main>
        {/* Camionul Lunii */}
        <BestTruckCard stats={stats} />

        {/* Radar Chart comparativ */}
        {selected.length >= 2 && (
          <ComparisonRadar selected={selected} stats={stats} />
        )}

        {/* Tabel */}
        <Card>
          <CardHeader>
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center justify-between")}>
              <div>
                <CardTitle>{t("fleetComparison.tableTitle")}</CardTitle>
                {selected.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("fleetComparison.selectedCount", { count: selected.length })}
                    {selected.length < 2 && ` — ${t("fleetComparison.selectMore")}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => exportExcel(stats, t)}
                  title={t("fleetComparison.export.excel")}
                >
                  <Download className={cn("h-4 w-4", !isMobile && "mr-2")} />
                  {!isMobile && t("fleetComparison.export.excel")}
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => exportPDF(stats, t)}
                  title={t("fleetComparison.export.pdf")}
                >
                  <FileText className={cn("h-4 w-4", !isMobile && "mr-2")} />
                  {!isMobile && t("fleetComparison.export.pdf")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-3">
                {stats.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("fleetComparison.noData")}</p>
                ) : (
                  stats.map((s) => (
                    <div key={s.truck.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selected.includes(s.truck.id)}
                            onCheckedChange={() => toggleSelect(s.truck.id)}
                            disabled={!selected.includes(s.truck.id) && selected.length >= 3}
                          />
                          <div>
                            <p className="font-semibold">{s.truck.plateNumber}</p>
                            <p className="text-xs text-muted-foreground">{s.truck.brand} {s.truck.model}</p>
                          </div>
                        </div>
                        <span className={cn("font-semibold text-sm",
                          s.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {s.profit.toLocaleString("ro-RO")} RON
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{t("fleetComparison.columns.tripCount")}: <span className="text-foreground">{s.tripCount}</span></span>
                        <span>{t("fleetComparison.columns.totalKm")}: <span className="text-foreground">{s.totalKm.toLocaleString("ro-RO")} km</span></span>
                        <span>{t("fleetComparison.columns.consumption")}: <span className="text-foreground">{s.avgConsumption > 0 ? `${s.avgConsumption.toFixed(1)} L` : "—"}</span></span>
                        <span>{t("fleetComparison.columns.maintenanceCost")}: <span className="text-foreground">{s.maintenanceCost.toLocaleString("ro-RO")} RON</span></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className={selected.includes(row.original.truck.id) ? "bg-primary/5" : ""}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          {t("fleetComparison.noData")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}