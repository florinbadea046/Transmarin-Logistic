import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  PlusCircle,
  Play,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  MapPin,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { InvoiceGenerator } from "@/modules/transport/pages/_components/invoice-generator";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import {
  getCollection,
  addItem,
  updateItem,
  removeItem,
  generateId,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

function useWindowWidth() {
  const [width, setWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

const STATUS_BADGE_CLASSES: Record<Trip["status"], string> = {
  planned:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  in_desfasurare:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  finalizata:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  anulata:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

function StatusBadge({
  status,
  label,
}: {
  status: Trip["status"];
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASSES[status]}`}
    >
      {label}
    </span>
  );
}

type TripFormValues = {
  orderId: string;
  driverId: string;
  truckId: string;
  departureDate: string;
  estimatedArrivalDate: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  revenue: number;
  status: "planned" | "in_desfasurare" | "finalizata" | "anulata";
  unscheduled?: boolean;
};

function buildSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z
    .object({
      orderId: z.string().min(1, t("trips.validation.orderRequired")),
      driverId: z.string().min(1, t("trips.validation.driverRequired")),
      truckId: z.string().min(1, t("trips.validation.truckRequired")),
      departureDate: z.string().optional().default(""),
      estimatedArrivalDate: z.string().optional().default(""),
      kmLoaded: z.number().positive(t("trips.validation.kmLoadedPositive")),
      kmEmpty: z.number().positive(t("trips.validation.kmEmptyPositive")),
      fuelCost: z.number().min(0, t("trips.validation.fuelCostMin")),
      revenue: z.number().min(0, t("trips.validation.revenueMin")),
      status: z.enum(["planned", "in_desfasurare", "finalizata", "anulata"]),
    })
    .refine(
      (data) =>
        !data.departureDate ||
        !data.estimatedArrivalDate ||
        data.estimatedArrivalDate >= data.departureDate,
      {
        message: t("trips.validation.arrivalAfterDeparture"),
        path: ["estimatedArrivalDate"],
      },
    );
}

function toRows(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
  t: ReturnType<typeof useTranslation>["t"],
) {
  return trips.map((trip, idx) => {
    const order = orders.find((o) => o.id === trip.orderId);
    const driver = drivers.find((d) => d.id === trip.driverId);
    const truck = trucks.find((tr) => tr.id === trip.truckId);
    return {
      [t("trips.export.nr")]: idx + 1,
      [t("trips.export.order")]: order ? order.clientName : trip.orderId,
      [t("trips.export.driver")]: driver?.name ?? trip.driverId,
      [t("trips.export.truck")]: truck ? truck.plateNumber : trip.truckId,
      [t("trips.export.route")]: order
        ? `${order.origin} → ${order.destination}`
        : "—",
      [t("trips.export.departure")]: trip.departureDate,
      [t("trips.export.arrival")]: trip.estimatedArrivalDate,
      [t("trips.export.kmLoaded")]: trip.kmLoaded,
      [t("trips.export.kmEmpty")]: trip.kmEmpty,
      [t("trips.export.fuelCost")]: trip.fuelCost,
      [t("trips.export.revenue")]: trip.revenue ?? 0,
      [t("trips.export.status")]: t(`trips.status.${trip.status}`),
    };
  });
}

function ExportMenu({
  trips,
  orders,
  drivers,
  trucks,
  t,
}: {
  trips: Trip[];
  orders: Order[];
  drivers: Driver[];
  trucks: Truck[];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(t("trips.title"), 14, 16);
    const rows = toRows(trips, orders, drivers, trucks, t);
    autoTable(doc, {
      head: [Object.keys(rows[0] ?? {})],
      body: rows.map((r) => Object.values(r).map(String)),
      startY: 22,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 30, 30] },
    });
    doc.save(`${t("trips.export.filename")}.pdf`);
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(
      toRows(trips, orders, drivers, trucks, t),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("trips.title"));
    XLSX.writeFile(wb, `${t("trips.export.filename")}.xlsx`);
  }

  function exportCSV() {
    const csv = Papa.unparse(toRows(trips, orders, drivers, trucks, t));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("trips.export.filename")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("trips.actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={exportPDF}>
          {t("trips.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={exportExcel}>
          {t("trips.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={exportCSV}>
          {t("trips.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildColumns(
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
  allTrips: Trip[],
  onStatusChange: (trip: Trip) => void,
  onEdit: (trip: Trip) => void,
  onDelete: (trip: Trip) => void,
  onGenerateInvoice: (trip: Trip) => void,
  t: ReturnType<typeof useTranslation>["t"],
  navigate: ReturnType<typeof useNavigate>,
): ColumnDef<Trip>[] {
  return [
    {
      id: "nr",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trips.columns.nr")} />
      ),
      cell: ({ row }) => {
        const idx = allTrips.findIndex((trip) => trip.id === row.original.id);
        return (
          <div className="tabular-nums text-muted-foreground text-sm">
            {idx + 1}
          </div>
        );
      },
      enableSorting: false,
      size: 50,
    },
    {
      accessorKey: "orderId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.order")}
        />
      ),
      cell: ({ row }) => {
        const order = orders.find((o) => o.id === row.getValue("orderId"));
        return (
          <div className="font-medium text-sm">
            {order ? (
              <span className="text-primary underline-offset-4 hover:underline cursor-default">
                {order.clientName}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {row.getValue("orderId")}
              </span>
            )}
          </div>
        );
      },
      filterFn: (row, _id, filterValue: string) => {
        if (!filterValue) return true;
        const order = orders.find((o) => o.id === row.getValue("orderId"));
        const search = filterValue.toLowerCase();
        return (
          (order?.clientName?.toLowerCase().includes(search) ?? false) ||
          (row.getValue("orderId") as string).toLowerCase().includes(search)
        );
      },
      enableSorting: false,
    },
    {
      id: "route",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.route")}
        />
      ),
      cell: ({ row }) => {
        const order = orders.find((o) => o.id === row.original.orderId);
        if (!order)
          return <div className="text-muted-foreground text-xs">—</div>;
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {order.origin} → {order.destination}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "driverId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.driver")}
        />
      ),
      cell: ({ row }) => {
        const driver = drivers.find((d) => d.id === row.getValue("driverId"));
        return (
          <div className="text-sm">
            {driver?.name ?? row.getValue("driverId")}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "truckId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.truck")}
        />
      ),
      cell: ({ row }) => {
        const truck = trucks.find((tr) => tr.id === row.getValue("truckId"));
        return (
          <div className="text-sm whitespace-nowrap">
            {truck
              ? `${truck.plateNumber} · ${truck.brand} ${truck.model}`
              : row.getValue("truckId")}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.status")}
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as Trip["status"];
        return (
          <StatusBadge status={status} label={t(`trips.status.${status}`)} />
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        if (!selected || selected.length === 0) return true;
        return selected.includes(row.getValue(id));
      },
      size: 150,
    },
    {
      accessorKey: "departureDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.departureDate")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-sm">
          {row.getValue("departureDate")}
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: "estimatedArrivalDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.arrivalDate")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-sm">
          {row.getValue("estimatedArrivalDate")}
        </div>
      ),
      enableSorting: true,
      size: 130,
    },
    {
      accessorKey: "kmLoaded",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.kmLoaded")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("kmLoaded") as number).toLocaleString()} km
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: "kmEmpty",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.kmEmpty")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("kmEmpty") as number).toLocaleString()} km
        </div>
      ),
      enableSorting: true,
      size: 100,
    },
    {
      accessorKey: "fuelCost",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.fuelCost")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("fuelCost") as number).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 140,
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.revenue")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {((row.getValue("revenue") as number) ?? 0).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 140,
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center text-xs text-muted-foreground">
          {t("trips.columns.actions")}
        </div>
      ),
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-center items-center gap-1">
            <button
              title={t("trips.actions.edit")}
              onClick={() => onEdit(trip)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-border/50 bg-transparent hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              title={
                trip.status === "in_desfasurare"
                  ? t("trips.delete.disabledTooltip")
                  : t("trips.actions.delete")
              }
              onClick={() => trip.status !== "in_desfasurare" && onDelete(trip)}
              disabled={trip.status === "in_desfasurare"}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-red-200 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </button>
            {trip.status === "planned" && (
              <>
                <button
                  title={t("trips.actions.start")}
                  onClick={() =>
                    onStatusChange({ ...trip, status: "in_desfasurare" })
                  }
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-green-300 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Play className="h-3 w-3 text-green-600" />
                </button>
                <button
                  title={t("trips.actions.cancel")}
                  onClick={() => onStatusChange({ ...trip, status: "anulata" })}
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <XCircle className="h-3 w-3 text-red-500" />
                </button>
              </>
            )}
            {trip.status === "in_desfasurare" && (
              <button
                title={t("trips.actions.finish")}
                onClick={() =>
                  onStatusChange({ ...trip, status: "finalizata" })
                }
                className="h-6 w-6 flex items-center justify-center rounded-md border border-green-400 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <CheckCircle className="h-3 w-3 text-green-600" />
              </button>
            )}
            {trip.status === "in_desfasurare" && (
              <button
                title={t("trips.actions.liveTrack")}
                onClick={() =>
                  navigate({
                    to: "/transport/trip-tracker/$tripId",
                    params: { tripId: trip.id },
                  })
                }
                className="h-6 w-6 flex items-center justify-center rounded-md border border-amber-300 bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <MapPin className="h-3 w-3 text-amber-500" />
              </button>
            )}
            {trip.status === "finalizata" && (
              <button
                title={t("trips.actions.generateInvoice")}
                onClick={() => {
                  onGenerateInvoice(trip);
                }}
                className="h-6 w-6 flex items-center justify-center rounded-md border border-violet-300 bg-transparent hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                <FileText className="h-3 w-3 text-violet-500" />
              </button>
            )}
          </div>
        );
      },
      size: 120,
    },
  ];
}

export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [data, setData] = React.useState<Trip[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingTrip, setDeletingTrip] = React.useState<Trip | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = React.useState(false);
  const [invoiceTrip, setInvoiceTrip] = React.useState<Trip | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const loadData = React.useCallback(() => {
    setData(getCollection<Trip>(STORAGE_KEYS.trips));
    setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (isMobile) {
      setColumnVisibility({
        driverId: false,
        truckId: false,
        route: false,
        kmLoaded: false,
        kmEmpty: false,
        fuelCost: false,
        revenue: false,
        estimatedArrivalDate: false,
      });
    } else if (isTablet) {
      setColumnVisibility({
        truckId: false,
        kmEmpty: false,
        fuelCost: false,
        revenue: false,
        estimatedArrivalDate: false,
      });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile, isTablet]);

  const handleStatusChange = React.useCallback(
    (updatedTrip: Trip) => {
      updateItem<Trip>(
        STORAGE_KEYS.trips,
        (tr) => tr.id === updatedTrip.id,
        () => updatedTrip,
      );
      if (updatedTrip.status === "finalizata") {
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === updatedTrip.orderId,
          (o) => ({ ...o, status: "delivered" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === updatedTrip.driverId,
          (d) => ({ ...d, status: "available" }),
        );
        toast.success(t("trips.toast.finished"));
      } else if (updatedTrip.status === "anulata") {
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === updatedTrip.orderId,
          (o) => ({ ...o, status: "cancelled" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === updatedTrip.driverId,
          (d) => ({ ...d, status: "available" }),
        );
        toast.info(t("trips.toast.cancelled"));
      } else if (updatedTrip.status === "in_desfasurare") {
        toast.success(t("trips.toast.started"));
      }
      loadData();
    },
    [loadData, t],
  );

  const handleDeleteRequest = React.useCallback((trip: Trip) => {
    setDeletingTrip(trip);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(() => {
    if (!deletingTrip) return;
    removeItem<Trip>(STORAGE_KEYS.trips, (tr) => tr.id === deletingTrip.id);
    toast.success(t("trips.toast.deleted"));
    setDeleteDialogOpen(false);
    setDeletingTrip(null);
    loadData();
  }, [deletingTrip, loadData, t]);

  const handleEdit = React.useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setDialogOpen(true);
  }, []);

  const handleGenerateInvoice = React.useCallback((trip: Trip) => {
    setInvoiceTrip(trip);
    setInvoiceDialogOpen(true);
  }, []);

  const statusFilterOptions = (
    ["planned", "in_desfasurare", "finalizata", "anulata"] as Trip["status"][]
  ).map((value) => ({ value, label: t(`trips.status.${value}`) }));

  const columns = React.useMemo(
    () =>
      buildColumns(
        orders,
        drivers,
        trucks,
        data,
        handleStatusChange,
        handleEdit,
        handleDeleteRequest,
        handleGenerateInvoice,
        t,
        navigate,
      ),
    [
      orders,
      drivers,
      trucks,
      data,
      handleStatusChange,
      handleEdit,
      handleDeleteRequest,
      handleGenerateInvoice,
      t,
      navigate,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const today = new Date().toISOString().split("T")[0];

  const schema = React.useMemo(() => buildSchema(t), [t]);

  const form = useForm<TripFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      orderId: "",
      driverId: "",
      truckId: "",
      departureDate: today,
      estimatedArrivalDate: today,
      kmLoaded: 0,
      kmEmpty: 0,
      fuelCost: 0,
      revenue: 0,
      status: "planned",
      unscheduled: false,
    },
  });

  React.useEffect(() => {
    if (dialogOpen && editingTrip) {
      form.reset({
        orderId: editingTrip.orderId,
        driverId: editingTrip.driverId,
        truckId: editingTrip.truckId,
        departureDate: editingTrip.departureDate ?? "",
        estimatedArrivalDate: editingTrip.estimatedArrivalDate ?? "",
        kmLoaded: editingTrip.kmLoaded,
        kmEmpty: editingTrip.kmEmpty,
        fuelCost: editingTrip.fuelCost,
        revenue: editingTrip.revenue ?? 0,
        status: editingTrip.status,
        unscheduled: !editingTrip.departureDate,
      });
    } else if (dialogOpen && !editingTrip) {
      form.reset({
        orderId: "",
        driverId: "",
        truckId: "",
        departureDate: today,
        estimatedArrivalDate: today,
        kmLoaded: 0,
        kmEmpty: 0,
        fuelCost: 0,
        revenue: 0,
        status: "planned",
        unscheduled: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editingTrip]);

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingTrip(null);
    form.reset();
  }

  function onSubmit(values: TripFormValues) {
    try {
      if (editingTrip) {
        const updatedTrip: Trip = {
          ...editingTrip,
          ...values,
          kmLoaded: Number(values.kmLoaded),
          kmEmpty: Number(values.kmEmpty),
          fuelCost: Number(values.fuelCost),
          revenue: Number(values.revenue),
        };
        updateItem<Trip>(
          STORAGE_KEYS.trips,
          (tr) => tr.id === editingTrip.id,
          () => updatedTrip,
        );
        toast.success(t("trips.toast.updated"));
      } else {
        const newTrip: Trip = {
          id: generateId(),
          ...values,
          status: "planned",
          kmLoaded: Number(values.kmLoaded),
          kmEmpty: Number(values.kmEmpty),
          fuelCost: Number(values.fuelCost),
          revenue: Number(values.revenue),
        };
        addItem<Trip>(STORAGE_KEYS.trips, newTrip);
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === values.orderId,
          (o) => ({ ...o, status: "in_transit" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === values.driverId,
          (d) => ({ ...d, status: "on_trip" }),
        );
        toast.success(t("trips.toast.added"));
      }
      loadData();
      handleCloseDialog();
    } catch (_e) {
      void _e;
      toast.error(t("trips.toast.error"));
    }
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trips.title")}</h1>
      </Header>

      <Main>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base md:text-lg">
              {t("trips.tableTitle")}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs
                value="table"
                onValueChange={(v) => {
                  if (v === "calendar")
                    navigate({ to: "/transport/trips-calendar" });
                  if (v === "map") navigate({ to: "/transport/trips-map" });
                  if (v === "dnd")
                    navigate({ to: "/transport/trips-calendar-dnd" });
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
              <ExportMenu
                trips={data}
                orders={orders}
                drivers={drivers}
                trucks={trucks}
                t={t}
              />
              <Button
                onClick={() => {
                  setEditingTrip(null);
                  setDialogOpen(true);
                }}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("trips.add")}</span>
                <span className="sm:hidden">{t("trips.addShort")}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder={t("trips.placeholders.search")}
              searchKey="orderId"
              filters={[
                {
                  columnId: "status",
                  title: t("trips.columns.status"),
                  options: statusFilterOptions,
                },
              ]}
              columnLabels={{
                orderId: t("trips.columns.order"),
                driverId: t("trips.columns.driver"),
                truckId: t("trips.columns.truck"),
                status: t("trips.columns.status"),
                departureDate: t("trips.columns.departureDate"),
                estimatedArrivalDate: t("trips.columns.arrivalDate"),
                kmLoaded: t("trips.columns.kmLoaded"),
                kmEmpty: t("trips.columns.kmEmpty"),
                fuelCost: t("trips.columns.fuelCost"),
                revenue: t("trips.columns.revenue"),
              }}
            />

            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const trip = row.original;
                    const order = orders.find((o) => o.id === trip.orderId);
                    const driver = drivers.find((d) => d.id === trip.driverId);
                    return (
                      <div
                        key={trip.id}
                        className="rounded-lg border p-3 space-y-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium leading-tight min-w-0 truncate">
                            {order?.clientName ?? trip.orderId}
                          </div>
                          <StatusBadge
                            status={trip.status}
                            label={t(`trips.status.${trip.status}`)}
                          />
                        </div>
                        {order && (
                          <div className="text-xs text-muted-foreground truncate">
                            {order.origin} → {order.destination}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="truncate">
                            {t("trips.mobile.driver")}:{" "}
                            <span className="text-foreground">
                              {driver?.name ?? "—"}
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.kmLoaded")}:{" "}
                            <span className="text-foreground">
                              {trip.kmLoaded} km
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.departure")}:{" "}
                            <span className="text-foreground">
                              {trip.departureDate}
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.kmEmpty")}:{" "}
                            <span className="text-foreground">
                              {trip.kmEmpty} km
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.arrival")}:{" "}
                            <span className="text-foreground">
                              {trip.estimatedArrivalDate}
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.fuelCost")}:{" "}
                            <span className="text-foreground">
                              {trip.fuelCost} RON
                            </span>
                          </span>
                          <span className="truncate">
                            {t("trips.mobile.revenue")}:{" "}
                            <span className="text-foreground">
                              {trip.revenue ?? 0} RON
                            </span>
                          </span>
                        </div>
                        <div className="flex gap-1.5 pt-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleEdit(trip)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            {t("trips.actions.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            disabled={trip.status === "in_desfasurare"}
                            title={
                              trip.status === "in_desfasurare"
                                ? t("trips.delete.disabledTooltip")
                                : t("trips.actions.delete")
                            }
                            onClick={() =>
                              trip.status !== "in_desfasurare" &&
                              handleDeleteRequest(trip)
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {t("trips.actions.delete")}
                          </Button>
                          {trip.status === "planned" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  handleStatusChange({
                                    ...trip,
                                    status: "in_desfasurare",
                                  })
                                }
                              >
                                <Play className="mr-1 h-3 w-3" />
                                {t("trips.actions.start")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-600 border-red-300"
                                onClick={() =>
                                  handleStatusChange({
                                    ...trip,
                                    status: "anulata",
                                  })
                                }
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                {t("trips.actions.cancel")}
                              </Button>
                            </>
                          )}
                          {trip.status === "in_desfasurare" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-green-600 border-green-400"
                              onClick={() =>
                                handleStatusChange({
                                  ...trip,
                                  status: "finalizata",
                                })
                              }
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {t("trips.actions.finish")}
                            </Button>
                          )}
                          {trip.status === "in_desfasurare" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-amber-600 border-amber-400"
                              onClick={() =>
                                navigate({
                                  to: "/transport/trip-tracker/$tripId",
                                  params: { tripId: trip.id },
                                })
                              }
                            >
                              <MapPin className="mr-1 h-3 w-3" />
                              {t("trips.actions.liveTrack")}
                            </Button>
                          )}
                          {trip.status === "finalizata" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-violet-600 border-violet-400"
                              onClick={() => handleGenerateInvoice(trip)}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              {t("trips.actions.generateInvoice")}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                    {t("trips.noResults")}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            style={{ width: header.getSize() }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
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
                          {t("trips.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[580px] overflow-y-auto max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>
              {editingTrip ? t("trips.edit") : t("trips.add")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingTrip
                ? t("trips.dialog.editDesc")
                : t("trips.dialog.addDesc")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("trips.fields.order")}</Label>
                  <FormField
                    control={form.control}
                    name="orderId"
                    render={({ field }) => (
                      <FormItem className="w-full min-w-0">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0 [&>span]:truncate [&>span]:text-left">
                              <SelectValue
                                placeholder={t("trips.placeholders.order")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent
                            className="max-h-52 w-[var(--radix-select-trigger-width)]"
                            position="popper"
                          >
                            {orders
                              .filter(
                                (o) =>
                                  o.status === "pending" ||
                                  o.status === "assigned" ||
                                  o.status === "in_transit" ||
                                  (editingTrip && o.id === editingTrip.orderId),
                              )
                              .map((order) => (
                                <SelectItem
                                  key={order.id}
                                  value={order.id}
                                  className="[&>span:last-child]:truncate [&>span:last-child]:block"
                                >
                                  {order.clientName} — {order.origin} →{" "}
                                  {order.destination}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.driver")}</Label>
                    <FormField
                      control={form.control}
                      name="driverId"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue
                                  placeholder={t("trips.placeholders.driver")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {drivers
                                .filter(
                                  (d) =>
                                    d.status === "available" ||
                                    (editingTrip &&
                                      d.id === editingTrip.driverId),
                                )
                                .map((driver) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.truck")}</Label>
                    <FormField
                      control={form.control}
                      name="truckId"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue
                                  placeholder={t("trips.placeholders.truck")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              {trucks
                                .filter(
                                  (tr) =>
                                    tr.status === "available" ||
                                    (editingTrip &&
                                      tr.id === editingTrip.truckId),
                                )
                                .map((truck) => (
                                  <SelectItem
                                    key={truck.id}
                                    value={truck.id}
                                    className="[&>span:last-child]:truncate [&>span:last-child]:block"
                                  >
                                    {truck.plateNumber} — {truck.brand}{" "}
                                    {truck.model}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unscheduled-check"
                    checked={form.watch("unscheduled") ?? false}
                    onChange={(e) => {
                      form.setValue("unscheduled", e.target.checked);
                      if (e.target.checked) {
                        form.setValue("departureDate", "");
                        form.setValue("estimatedArrivalDate", "");
                      } else {
                        form.setValue("departureDate", today);
                        form.setValue("estimatedArrivalDate", today);
                      }
                    }}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <Label
                    htmlFor="unscheduled-check"
                    className="cursor-pointer text-sm font-normal"
                  >
                    {t("trips.fields.unscheduled")}
                  </Label>
                </div>

                {!form.watch("unscheduled") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5 min-w-0">
                      <Label>{t("trips.fields.departureDate")}</Label>
                      <FormField
                        control={form.control}
                        name="departureDate"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormControl>
                              <Input
                                type="date"
                                className="w-full min-w-0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-1.5 min-w-0">
                      <Label>{t("trips.fields.arrivalDate")}</Label>
                      <FormField
                        control={form.control}
                        name="estimatedArrivalDate"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormControl>
                              <Input
                                type="date"
                                className="w-full min-w-0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.kmLoaded")}</Label>
                    <FormField
                      control={form.control}
                      name="kmLoaded"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t("trips.placeholders.km")}
                              className="w-full min-w-0"
                              value={
                                field.value === 0 ? "" : String(field.value)
                              }
                              onChange={(e) => {
                                const v = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(
                                  v === "" ? 0 : parseFloat(v) || 0,
                                );
                              }}
                              onBlur={() => {
                                if (!field.value) field.onChange(0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.kmEmpty")}</Label>
                    <FormField
                      control={form.control}
                      name="kmEmpty"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t("trips.placeholders.km")}
                              className="w-full min-w-0"
                              value={
                                field.value === 0 ? "" : String(field.value)
                              }
                              onChange={(e) => {
                                const v = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(
                                  v === "" ? 0 : parseFloat(v) || 0,
                                );
                              }}
                              onBlur={() => {
                                if (!field.value) field.onChange(0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.fuelCost")}</Label>
                    <FormField
                      control={form.control}
                      name="fuelCost"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t("trips.placeholders.km")}
                              className="w-full min-w-0"
                              value={
                                field.value === 0 ? "" : String(field.value)
                              }
                              onChange={(e) => {
                                const v = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(
                                  v === "" ? 0 : parseFloat(v) || 0,
                                );
                              }}
                              onBlur={() => {
                                if (!field.value) field.onChange(0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.revenue")}</Label>
                    <FormField
                      control={form.control}
                      name="revenue"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t("trips.placeholders.km")}
                              className="w-full min-w-0"
                              value={
                                field.value === 0 ? "" : String(field.value)
                              }
                              onChange={(e) => {
                                const v = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(
                                  v === "" ? 0 : parseFloat(v) || 0,
                                );
                              }}
                              onBlur={() => {
                                if (!field.value) field.onChange(0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                {editingTrip && (
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.status")}</Label>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue
                                  placeholder={t("trips.placeholders.status")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">
                                {t("trips.status.planned")}
                              </SelectItem>
                              <SelectItem value="in_desfasurare">
                                {t("trips.status.in_desfasurare")}
                              </SelectItem>
                              <SelectItem value="finalizata">
                                {t("trips.status.finalizata")}
                              </SelectItem>
                              <SelectItem value="anulata">
                                {t("trips.status.anulata")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 mt-5 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  {t("trips.cancel")}
                </Button>
                <Button type="submit">
                  {editingTrip ? t("trips.save") : t("trips.saveNew")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {invoiceTrip && (
        <InvoiceGenerator
          trip={invoiceTrip}
          open={invoiceDialogOpen}
          onOpenChange={(v) => {
            setInvoiceDialogOpen(v);
            if (!v) setInvoiceTrip(null);
          }}
          onInvoiceSaved={loadData}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          setDeleteDialogOpen(v);
          if (!v) setDeletingTrip(null);
        }}
        title={t("trips.delete.title")}
        desc={
          deletingTrip
            ? t("trips.delete.desc", { orderId: deletingTrip.orderId })
            : t("trips.delete.descFallback")
        }
        confirmText={t("trips.delete.confirm")}
        cancelBtnText={t("trips.cancel")}
        destructive
        handleConfirm={handleDeleteConfirm}
      />
    </>
  );
}
