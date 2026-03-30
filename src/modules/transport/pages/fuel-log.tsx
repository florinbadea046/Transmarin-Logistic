// A40. Gestionare Combustibil
// Ruta: /transport/fuel-log
// TanStack Table + CRUD complet cu Zod
// KPI: consum mediu L/100km, cost total luna curenta, statia cea mai folosita
// Grafic LineChart consum/luna (Recharts)
// Export Excel
// Responsive: useMobile(640)
// i18n: fara text hardcodat

import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Plus, Pencil, Trash2, Fuel, DollarSign, MapPin, Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";

import { getCollection, addItem, updateItem, removeItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import type { Driver } from "@/modules/transport/types";
import type { FuelLog } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ── Zod schema ──────────────────────────────────────────────

const fuelSchema = z.object({
  truckId: z.string().min(1),
  driverId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  station: z.string().min(2),
  liters: z.number({ message: "Litri invalizi" }).positive(),
  pricePerLiter: z.number({ message: "Pret invalid" }).positive(),
  kmAtFueling: z.number({ message: "Km invalizi" }).min(0),
});

type FuelFormData = z.infer<typeof fuelSchema>;
type FuelFormErrors = Partial<Record<keyof FuelFormData, string>>;

const EMPTY_FORM: FuelFormData = {
  truckId: "",
  driverId: "",
  date: "",
  station: "",
  liters: 0,
  pricePerLiter: 0,
  kmAtFueling: 0,
};

// ── Export Excel ────────────────────────────────────────────

function exportFuelExcel(
  logs: FuelLog[],
  trucks: Truck[],
  drivers: Driver[],
  t: (k: string) => string,
) {
  const getTruck = (id: string) => trucks.find((tr) => tr.id === id);
  const getDriver = (id: string) => drivers.find((d) => d.id === id);

  const rows = logs.map((l) => ({
    [t("fuelLog.columns.date")]: l.date,
    [t("fuelLog.columns.truck")]: getTruck(l.truckId)?.plateNumber ?? l.truckId,
    [t("fuelLog.columns.driver")]: getDriver(l.driverId)?.name ?? l.driverId,
    [t("fuelLog.columns.station")]: l.station,
    [t("fuelLog.columns.liters")]: l.liters,
    [t("fuelLog.columns.pricePerLiter")]: l.pricePerLiter,
    [t("fuelLog.columns.totalCost")]: l.totalCost,
    [t("fuelLog.columns.kmAtFueling")]: l.kmAtFueling,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("fuelLog.export.sheetName"));
  XLSX.writeFile(wb, `${t("fuelLog.export.filename")}.xlsx`);
}

// ── KPI Cards ────────────────────────────────────────────────

function FuelKpiCards({ logs, trucks }: { logs: FuelLog[]; trucks: Truck[] }) {
  const { t } = useTranslation();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const logsThisMonth = logs.filter((l) => l.date.startsWith(thisMonth));
  const totalCostMonth = logsThisMonth.reduce((s, l) => s + l.totalCost, 0);

  // Consum mediu L/100km per camion
  const consumptions: number[] = [];
  trucks.forEach((truck) => {
    const truckLogs = logs
      .filter((l) => l.truckId === truck.id)
      .sort((a, b) => a.kmAtFueling - b.kmAtFueling);
    if (truckLogs.length >= 2) {
      const kmDiff = truckLogs[truckLogs.length - 1].kmAtFueling - truckLogs[0].kmAtFueling;
      const totalLiters = truckLogs.slice(1).reduce((s, l) => s + l.liters, 0);
      if (kmDiff > 0) consumptions.push((totalLiters / kmDiff) * 100);
    }
  });
  const avgConsumption = consumptions.length
    ? consumptions.reduce((s, c) => s + c, 0) / consumptions.length
    : 0;

  // Statia cea mai folosita
  const stationCount: Record<string, number> = {};
  logs.forEach((l) => { stationCount[l.station] = (stationCount[l.station] ?? 0) + 1; });
  const topStation = Object.entries(stationCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="grid gap-4 mb-6 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("fuelLog.kpi.avgConsumption")}</CardTitle>
          <Fuel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgConsumption.toFixed(1)} L/100km</div>
          <p className="text-xs text-muted-foreground">{t("fuelLog.kpi.avgConsumptionDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("fuelLog.kpi.totalCostMonth")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCostMonth.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("fuelLog.kpi.totalCostMonthDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("fuelLog.kpi.topStation")}</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate">{topStation}</div>
          <p className="text-xs text-muted-foreground">{t("fuelLog.kpi.topStationDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Grafic consum/luna ──────────────────────────────────────

function FuelChart({ logs }: { logs: FuelLog[] }) {
  const { t } = useTranslation();

  const monthlyData: Record<string, { liters: number; cost: number }> = {};
  logs.forEach((l) => {
    const month = l.date.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { liters: 0, cost: 0 };
    monthlyData[month].liters += l.liters;
    monthlyData[month].cost += l.totalCost;
  });

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({ month, ...data }));

  if (chartData.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("fuelLog.chart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : 0;
                return [
                  name === "liters" ? `${num.toFixed(0)} L` : `${num.toLocaleString("ro-RO")} RON`,
                  name === "liters" ? t("fuelLog.chart.liters") : t("fuelLog.chart.cost"),
                ];
              }}
            />
            <Line type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={2} dot={false} name="liters" />
            <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} name="cost" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Dialog CRUD ─────────────────────────────────────────────

function FuelDialog({
  open, onOpenChange, editingLog, trucks, drivers, isMobile, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingLog: FuelLog | null;
  trucks: Truck[];
  drivers: Driver[];
  isMobile: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FuelFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<FuelFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    if (editingLog) {
      setForm({
        truckId: editingLog.truckId,
        driverId: editingLog.driverId,
        date: editingLog.date,
        station: editingLog.station,
        liters: editingLog.liters,
        pricePerLiter: editingLog.pricePerLiter,
        kmAtFueling: editingLog.kmAtFueling,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editingLog]);

  const patch = (p: Partial<FuelFormData>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = () => {
    const result = fuelSchema.safeParse(form);
    if (!result.success) {
      const errs: FuelFormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FuelFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    const data = result.data;
    const totalCost = parseFloat((data.liters * data.pricePerLiter).toFixed(2));

    if (editingLog) {
      updateItem<FuelLog>(
        STORAGE_KEYS.fuelLog,
        (l) => l.id === editingLog.id,
        (l) => ({ ...l, ...data, totalCost }),
      );
      toast.success(t("fuelLog.toastUpdated"));
    } else {
      addItem<FuelLog>(STORAGE_KEYS.fuelLog, {
        id: generateId(),
        ...data,
        totalCost,
      });
      toast.success(t("fuelLog.toastAdded"));
    }

    onSave();
    onOpenChange(false);
  };

  const totalCostPreview = (form.liters * form.pricePerLiter).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex flex-col gap-4", isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{editingLog ? t("fuelLog.edit") : t("fuelLog.add")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Camion */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.truck")}</Label>
            <Select value={form.truckId} onValueChange={(v) => patch({ truckId: v })}>
              <SelectTrigger><SelectValue placeholder={t("fuelLog.placeholders.truck")} /></SelectTrigger>
              <SelectContent>
                {trucks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>{tr.plateNumber} — {tr.brand} {tr.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truckId && <p className="text-xs text-red-500">{t("fuelLog.validation.truckRequired")}</p>}
          </div>

          {/* Sofer */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.driver")}</Label>
            <Select value={form.driverId} onValueChange={(v) => patch({ driverId: v })}>
              <SelectTrigger><SelectValue placeholder={t("fuelLog.placeholders.driver")} /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.driverId && <p className="text-xs text-red-500">{t("fuelLog.validation.driverRequired")}</p>}
          </div>

          {/* Data */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.date")}</Label>
            <Input type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
          </div>

          {/* Statie */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.station")}</Label>
            <Input value={form.station} onChange={(e) => patch({ station: e.target.value })}
              placeholder={t("fuelLog.placeholders.station")} />
            {errors.station && <p className="text-xs text-red-500">{errors.station}</p>}
          </div>

          {/* Litri */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.liters")}</Label>
            <Input type="number" min={0} step={0.1} value={form.liters}
              onChange={(e) => patch({ liters: parseFloat(e.target.value) || 0 })} />
            {errors.liters && <p className="text-xs text-red-500">{errors.liters}</p>}
          </div>

          {/* Pret/litru */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.pricePerLiter")}</Label>
            <Input type="number" min={0} step={0.01} value={form.pricePerLiter}
              onChange={(e) => patch({ pricePerLiter: parseFloat(e.target.value) || 0 })} />
            {errors.pricePerLiter && <p className="text-xs text-red-500">{errors.pricePerLiter}</p>}
          </div>

          {/* Km la bord */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.kmAtFueling")}</Label>
            <Input type="number" min={0} value={form.kmAtFueling}
              onChange={(e) => patch({ kmAtFueling: parseFloat(e.target.value) || 0 })} />
            {errors.kmAtFueling && <p className="text-xs text-red-500">{errors.kmAtFueling}</p>}
          </div>

          {/* Total cost preview */}
          <div className="space-y-1">
            <Label>{t("fuelLog.fields.totalCost")}</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
              {totalCostPreview} RON
            </div>
          </div>
        </div>

        <DialogFooter className={cn(isMobile && "flex-col gap-2")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("fuelLog.cancel")}
          </Button>
          <Button onClick={handleSubmit} className={cn(isMobile && "w-full")}>
            {editingLog ? t("fuelLog.save") : t("fuelLog.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mobile Card ─────────────────────────────────────────────

function FuelMobileCard({ log, truck, driver, onEdit, onDelete }: {
  log: FuelLog;
  truck?: Truck;
  driver?: Driver;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{truck?.plateNumber ?? log.truckId}</p>
          <p className="text-xs text-muted-foreground">{driver?.name ?? log.driverId}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{log.date}</span>
        <span>{log.station}</span>
        <span>{log.liters} L</span>
        <span>{log.pricePerLiter} RON/L</span>
        <span className="font-medium text-foreground">{log.totalCost.toLocaleString("ro-RO")} RON</span>
        <span>{log.kmAtFueling.toLocaleString("ro-RO")} km</span>
      </div>
    </div>
  );
}

// ── Pagina ───────────────────────────────────────────────────

export default function FuelLogPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);

  const [logs, setLogs] = React.useState<FuelLog[]>(() =>
    getCollection<FuelLog>(STORAGE_KEYS.fuelLog),
  );
  const [trucks] = React.useState<Truck[]>(() => getCollection<Truck>(STORAGE_KEYS.trucks));
  const [drivers] = React.useState<Driver[]>(() => getCollection<Driver>(STORAGE_KEYS.drivers));

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<FuelLog | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);

  const refreshLogs = () => setLogs(getCollection<FuelLog>(STORAGE_KEYS.fuelLog));

  const getTruck = React.useCallback((id: string) => trucks.find((tr) => tr.id === id), [trucks]);
  const getDriver = React.useCallback((id: string) => drivers.find((d) => d.id === id), [drivers]);

  const handleDelete = () => {
    if (!deleteId) return;
    removeItem<FuelLog>(STORAGE_KEYS.fuelLog, (l) => l.id === deleteId);
    toast.success(t("fuelLog.toastDeleted"));
    setDeleteId(null);
    refreshLogs();
  };

  const columns: ColumnDef<FuelLog>[] = React.useMemo(() => [
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.date")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.getValue("date")}</span>,
    },
    {
      accessorKey: "truckId",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.truck")} />,
      cell: ({ row }) => {
        const truck = getTruck(row.getValue("truckId"));
        return (
          <div>
            <div className="font-medium whitespace-nowrap">{truck?.plateNumber ?? row.getValue("truckId")}</div>
            <div className="text-xs text-muted-foreground">{truck?.brand} {truck?.model}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "driverId",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.driver")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{getDriver(row.getValue("driverId"))?.name ?? row.getValue("driverId")}</span>,
    },
    {
      accessorKey: "station",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.station")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.getValue("station")}</span>,
    },
    {
      accessorKey: "liters",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.liters")} />,
      cell: ({ row }) => <span>{(row.getValue("liters") as number).toFixed(1)} L</span>,
    },
    {
      accessorKey: "pricePerLiter",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.pricePerLiter")} />,
      cell: ({ row }) => <span>{(row.getValue("pricePerLiter") as number).toFixed(2)} RON</span>,
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.totalCost")} />,
      cell: ({ row }) => <span className="font-medium whitespace-nowrap">{(row.getValue("totalCost") as number).toLocaleString("ro-RO")} RON</span>,
    },
    {
      accessorKey: "kmAtFueling",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fuelLog.columns.kmAtFueling")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{(row.getValue("kmAtFueling") as number).toLocaleString("ro-RO")} km</span>,
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditingLog(row.original); setDialogOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [getTruck, getDriver, t]);

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      if (!q) return true;
      const truck = getTruck(row.original.truckId);
      const driver = getDriver(row.original.driverId);
      return (
        (truck?.plateNumber ?? "").toLowerCase().includes(q) ||
        (driver?.name ?? "").toLowerCase().includes(q) ||
        row.original.station.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("fuelLog.title")}</h1>
      </Header>
      <Main>
        <FuelKpiCards logs={logs} trucks={trucks} />
        <FuelChart logs={logs} />

        <Card>
          <CardHeader>
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center justify-between")}>
              <CardTitle>{t("fuelLog.listTitle")}</CardTitle>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-between")}>
                <Input
                  placeholder={t("fuelLog.placeholders.search")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); table.setPageIndex(0); }}
                  className={isMobile ? "flex-1" : "w-64"}
                />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size={isMobile ? "icon" : "sm"}
                    onClick={() => exportFuelExcel(logs, trucks, drivers, t)}
                    title={t("fuelLog.actions.export")}>
                    <Download className={cn("h-4 w-4", !isMobile && "mr-2")} />
                    {!isMobile && t("fuelLog.actions.export")}
                  </Button>
                  <Button size={isMobile ? "icon" : "sm"}
                    onClick={() => { setEditingLog(null); setDialogOpen(true); }}>
                    <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
                    {!isMobile && t("fuelLog.actions.add")}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("fuelLog.noResults")}</p>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <FuelMobileCard
                      key={row.id}
                      log={row.original}
                      truck={getTruck(row.original.truckId)}
                      driver={getDriver(row.original.driverId)}
                      onEdit={() => { setEditingLog(row.original); setDialogOpen(true); }}
                      onDelete={() => setDeleteId(row.original.id)}
                    />
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
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          {t("fuelLog.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      <FuelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingLog={editingLog}
        trucks={trucks}
        drivers={drivers}
        isMobile={isMobile}
        onSave={refreshLogs}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("fuelLog.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("fuelLog.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("fuelLog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("fuelLog.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}