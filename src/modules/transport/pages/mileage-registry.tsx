import * as React from "react";
import { useTranslation } from "react-i18next";
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
  Gauge,
  TrendingUp,
  AlertTriangle,
  Download,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/pagination";

import type { Truck, Trip } from "@/modules/transport/types";
import { getCollection, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

import {
  type MileageEntry,
  type RowData,
  getMileageEntries,
  upsertEntry,
  buildRows,
  buildChartData,
  entrySchema,
} from "./_components/mileage-registry-utils";
import { MileageChart } from "./_components/mileage-registry-chart";
import { MileageEditDialog } from "./_components/mileage-registry-dialog";
import { MileageMobileCard } from "./_components/mileage-registry-mobile-card";

export type { MileageEntry };

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

export default function MileageRegistryPage() {
  const { t } = useTranslation();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [selectedMonth, setSelectedMonth] = React.useState(() =>
    format(new Date(), "yyyy-MM"),
  );

  const [trucks, setTrucks] = React.useState<Truck[]>([]);
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [entries, setEntries] = React.useState<MileageEntry[]>([]);

  const [editRow, setEditRow] = React.useState<RowData | null>(null);
  const [formKmStart, setFormKmStart] = React.useState("");
  const [formKmEnd, setFormKmEnd] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const loadData = React.useCallback(() => {
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
    setTrips(getCollection<Trip>(STORAGE_KEYS.trips));
    setEntries(getMileageEntries());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = React.useMemo(
    () => buildRows(trucks, trips, selectedMonth, entries),
    [trucks, trips, selectedMonth, entries],
  );

  const alertRows = rows.filter((r) => r.hasAlert);

  const chartData = React.useMemo(
    () => buildChartData(trucks, entries),
    [trucks, entries],
  );

  const monthOptions = React.useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(format(d, "yyyy-MM"));
    }
    return opts;
  }, []);

  const columns = React.useMemo<ColumnDef<RowData>[]>(
    () => [
      {
        id: "plateNumber",
        accessorFn: (r) => r.truck.plateNumber,
        header: t("mileageRegistry.columns.truck"),
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-sm">
            {row.original.truck.plateNumber}
          </span>
        ),
        size: 120,
      },
      {
        id: "brand",
        header: t("mileageRegistry.columns.brand"),
        cell: ({ row }) =>
          `${row.original.truck.brand} ${row.original.truck.model}`,
        size: 140,
      },
      {
        accessorKey: "kmStart",
        header: t("mileageRegistry.columns.kmStart"),
        cell: ({ row }) => row.original.kmStart.toLocaleString(),
        size: 110,
      },
      {
        accessorKey: "kmEnd",
        header: t("mileageRegistry.columns.kmEnd"),
        cell: ({ row }) => row.original.kmEnd.toLocaleString(),
        size: 110,
      },
      {
        accessorKey: "kmDriven",
        header: t("mileageRegistry.columns.kmDriven"),
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.kmDriven.toLocaleString()}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "kmTrips",
        header: t("mileageRegistry.columns.kmTrips"),
        cell: ({ row }) => row.original.kmTrips.toLocaleString(),
        size: 110,
      },
      {
        accessorKey: "avgPerDay",
        header: t("mileageRegistry.columns.avgPerDay"),
        cell: ({ row }) => `${row.original.avgPerDay.toLocaleString()} km`,
        size: 110,
      },
      {
        id: "discrepancy",
        header: t("mileageRegistry.columns.discrepancy"),
        cell: ({ row }) =>
          row.original.hasAlert ? (
            <Badge variant="destructive">
              {(row.original.discrepancyPct * 100).toFixed(1)}%
            </Badge>
          ) : (
            <Badge variant="outline">
              {(row.original.discrepancyPct * 100).toFixed(1)}%
            </Badge>
          ),
        size: 100,
      },
      {
        id: "actions",
        header: t("mileageRegistry.columns.actions"),
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {t("mileageRegistry.actions.update")}
          </Button>
        ),
        size: 110,
      },
    ],

    [t],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  function handleEdit(row: RowData) {
    setEditRow(row);
    setFormKmStart(String(row.kmStart));
    setFormKmEnd(String(row.kmEnd));
    setFormErrors({});
  }

  function handleSave() {
    const parsed = entrySchema.safeParse({
      kmStart: formKmStart,
      kmEnd: formKmEnd,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((e) => {
        errs[e.path[0] as string] = t(e.message as string);
      });
      setFormErrors(errs);
      return;
    }
    const { kmStart, kmEnd } = parsed.data;
    if (kmEnd < kmStart) {
      setFormErrors({ kmEnd: t("mileageRegistry.validation.kmEndAfterStart") });
      return;
    }
    upsertEntry({
      truckId: editRow!.truck.id,
      month: selectedMonth,
      kmStart,
      kmEnd,
    });
    if (kmEnd > editRow!.truck.mileage) {
      updateItem<Truck>(
        STORAGE_KEYS.trucks,
        (tr) => tr.id === editRow!.truck.id,
        (tr) => ({ ...tr, mileage: kmEnd }),
      );
    }
    toast.success(t("mileageRegistry.toast.saved"));
    setEditRow(null);
    loadData();
  }

  function handleExport() {
    const wsData = [
      [
        t("mileageRegistry.columns.truck"),
        t("mileageRegistry.columns.brand"),
        t("mileageRegistry.columns.kmStart"),
        t("mileageRegistry.columns.kmEnd"),
        t("mileageRegistry.columns.kmDriven"),
        t("mileageRegistry.columns.kmTrips"),
        t("mileageRegistry.columns.avgPerDay"),
        t("mileageRegistry.columns.discrepancy"),
      ],
      ...rows.map((r) => [
        r.truck.plateNumber,
        `${r.truck.brand} ${r.truck.model}`,
        r.kmStart,
        r.kmEnd,
        r.kmDriven,
        r.kmTrips,
        r.avgPerDay,
        `${(r.discrepancyPct * 100).toFixed(1)}%`,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("mileageRegistry.export.sheetName"));
    XLSX.writeFile(
      wb,
      `${t("mileageRegistry.export.filename")}-${selectedMonth}.xlsx`,
    );
  }

  const totalKmDriven = rows.reduce((s, r) => s + r.kmDriven, 0);
  const avgDaily =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.avgPerDay, 0) / rows.length)
      : 0;

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("mileageRegistry.title")}</h1>
      </Header>

      <Main className="space-y-4 px-2 sm:px-4 pb-6">
        {alertRows.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t("mileageRegistry.alert.discrepancy", {
                count: alertRows.length,
                trucks: alertRows.map((r) => r.truck.plateNumber).join(", "),
              })}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {t("mileageRegistry.kpi.totalKm")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                {totalKmDriven.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t("mileageRegistry.kpi.totalKmDesc")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {t("mileageRegistry.kpi.avgDaily")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                {avgDaily.toLocaleString()}{" "}
                <span className="text-sm font-normal">km</span>
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t("mileageRegistry.kpi.avgDailyDesc")}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {t("mileageRegistry.kpi.alerts")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                {alertRows.length}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t("mileageRegistry.kpi.alertsDesc")}
              </p>
            </CardContent>
          </Card>
        </div>

        <MileageChart chartData={chartData} trucks={trucks} />

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-3 px-3 sm:px-6 pt-4 pb-3">
            <CardTitle className="text-sm sm:text-base">
              {t("mileageRegistry.tableTitle")}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((mo) => (
                    <SelectItem key={mo} value={mo} className="text-xs">
                      {mo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={t("mileageRegistry.placeholders.search")}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 w-36 sm:w-44 text-xs"
              />

              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-8 text-xs ml-auto"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {t("mileageRegistry.actions.export")}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-0 sm:px-6 pb-4 space-y-3">
            {isMobile ? (
              <div className="space-y-2 px-3">
                {table.getRowModel().rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {t("mileageRegistry.noResults")}
                  </p>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <MileageMobileCard
                      key={row.original.truck.id}
                      row={row.original}
                      onEdit={handleEdit}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((h) => (
                          <TableHead key={h.id} style={{ width: h.getSize() }}>
                            {h.isPlaceholder
                              ? null
                              : flexRender(
                                  h.column.columnDef.header,
                                  h.getContext(),
                                )}
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
                            <TableCell
                              key={cell.id}
                              style={{ width: cell.column.getSize() }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {t("mileageRegistry.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="px-3 sm:px-0">
              <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
            </div>
          </CardContent>
        </Card>
      </Main>

      <MileageEditDialog
        editRow={editRow}
        selectedMonth={selectedMonth}
        formKmStart={formKmStart}
        formKmEnd={formKmEnd}
        formErrors={formErrors}
        onFormKmStartChange={setFormKmStart}
        onFormKmEndChange={setFormKmEnd}
        onSave={handleSave}
        onClose={() => setEditRow(null)}
      />
    </>
  );
}
