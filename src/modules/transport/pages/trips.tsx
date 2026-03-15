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
import { PlusCircle, Play, CheckCircle, XCircle, Pencil } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import {
  getCollection,
  addItem,
  updateItem,
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

const statusMeta: Record<
  Trip["status"],
  { label: string; badgeClass: string }
> = {
  planned: {
    label: "Planificată",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_desfasurare: {
    label: "În desfășurare",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  finalizata: {
    label: "Finalizată",
    badgeClass:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  anulata: {
    label: "Anulată",
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
};

const statusFilterOptions = (Object.keys(statusMeta) as Trip["status"][]).map(
  (value) => ({ value, label: statusMeta[value].label }),
);

function StatusBadge({ status }: { status: Trip["status"] }) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

function toRows(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
) {
  return trips.map((t, idx) => {
    const order = orders.find((o) => o.id === t.orderId);
    const driver = drivers.find((d) => d.id === t.driverId);
    const truck = trucks.find((tr) => tr.id === t.truckId);
    return {
      "Nr. cursă": idx + 1,
      Comandă: order ? order.clientName : t.orderId,
      Șofer: driver?.name ?? t.driverId,
      Camion: truck ? truck.plateNumber : t.truckId,
      Rută: order ? `${order.origin} → ${order.destination}` : "—",
      "Data plecare": t.departureDate,
      "Data sosire estimată": t.estimatedArrivalDate,
      "Km încărcat": t.kmLoaded,
      "Km gol": t.kmEmpty,
      "Cost combustibil (RON)": t.fuelCost,
      Status: statusMeta[t.status]?.label ?? t.status,
    };
  });
}

function exportPDF(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Curse", 14, 16);
  const rows = toRows(trips, orders, drivers, trucks);
  autoTable(doc, {
    head: [Object.keys(rows[0] ?? {})],
    body: rows.map((r) => Object.values(r).map(String)),
    startY: 22,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("curse.pdf");
}

function exportExcel(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
) {
  const ws = XLSX.utils.json_to_sheet(toRows(trips, orders, drivers, trucks));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Curse");
  XLSX.writeFile(wb, "curse.xlsx");
}

function exportCSV(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
) {
  const csv = Papa.unparse(toRows(trips, orders, drivers, trucks));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "curse.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu({
  trips,
  orders,
  drivers,
  trucks,
}: {
  trips: Trip[];
  orders: Order[];
  drivers: Driver[];
  trucks: Truck[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportPDF(trips, orders, drivers, trucks)}
        >
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(trips, orders, drivers, trucks)}
        >
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportCSV(trips, orders, drivers, trucks)}
        >
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const tripSchema = z
  .object({
    orderId: z.string().min(1, "Selectează o comandă"),
    driverId: z.string().min(1, "Selectează un șofer"),
    truckId: z.string().min(1, "Selectează un camion"),
    departureDate: z.string().min(1, "Data plecare este obligatorie"),
    estimatedArrivalDate: z
      .string()
      .min(1, "Data sosire estimată este obligatorie"),
    kmLoaded: z.number().positive("Km încărcat trebuie să fie > 0"),
    kmEmpty: z.number().positive("Km gol trebuie să fie > 0"),
    fuelCost: z.number().min(0, "Cost combustibil trebuie să fie >= 0"),
    status: z.enum(["planned", "in_desfasurare", "finalizata", "anulata"]),
  })
  .refine(
    (data) =>
      !data.departureDate ||
      !data.estimatedArrivalDate ||
      data.estimatedArrivalDate >= data.departureDate,
    {
      message: "Data sosire trebuie să fie după data plecare",
      path: ["estimatedArrivalDate"],
    },
  );

type TripFormValues = {
  orderId: string;
  driverId: string;
  truckId: string;
  departureDate: string;
  estimatedArrivalDate: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  status: "planned" | "in_desfasurare" | "finalizata" | "anulata";
};

function buildColumns(
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
  allTrips: Trip[],
  onStatusChange: (trip: Trip) => void,
  onEdit: (trip: Trip) => void,
): ColumnDef<Trip>[] {
  return [
    {
      id: "nr",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nr." />
      ),
      cell: ({ row }) => {
        const idx = allTrips.findIndex((t) => t.id === row.original.id);
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
        <DataTableColumnHeader column={column} title="Comandă" />
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
        <DataTableColumnHeader column={column} title="Rută" />
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
        <DataTableColumnHeader column={column} title="Șofer" />
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
        <DataTableColumnHeader column={column} title="Camion" />
      ),
      cell: ({ row }) => {
        const truck = trucks.find((t) => t.id === row.getValue("truckId"));
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
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status") as Trip["status"]} />
      ),
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
        <DataTableColumnHeader column={column} title="Data plecare" />
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
        <DataTableColumnHeader column={column} title="Sosire estimată" />
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
        <DataTableColumnHeader column={column} title="Km încărcat" />
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
        <DataTableColumnHeader column={column} title="Km gol" />
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
        <DataTableColumnHeader column={column} title="Cost combustibil" />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("fuelCost") as number).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 150,
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center text-xs text-muted-foreground">Acțiuni</div>
      ),
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-center items-center gap-1">
            <button
              title="Editează"
              onClick={() => onEdit(trip)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-border/50 bg-transparent hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            {trip.status === "planned" && (
              <>
                <button
                  title="Pornește"
                  onClick={() =>
                    onStatusChange({ ...trip, status: "in_desfasurare" })
                  }
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-green-300 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Play className="h-3 w-3 text-green-600" />
                </button>
                <button
                  title="Anulează"
                  onClick={() => onStatusChange({ ...trip, status: "anulata" })}
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <XCircle className="h-3 w-3 text-red-500" />
                </button>
              </>
            )}
            {trip.status === "in_desfasurare" && (
              <button
                title="Finalizează"
                onClick={() =>
                  onStatusChange({ ...trip, status: "finalizata" })
                }
                className="h-6 w-6 flex items-center justify-center rounded-md border border-green-400 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <CheckCircle className="h-3 w-3 text-green-600" />
              </button>
            )}
          </div>
        );
      },
      size: 100,
    },
  ];
}

export default function TripsPage() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [data, setData] = React.useState<Trip[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null);

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
        estimatedArrivalDate: false,
      });
    } else if (isTablet) {
      setColumnVisibility({
        truckId: false,
        kmEmpty: false,
        fuelCost: false,
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
        (t) => t.id === updatedTrip.id,
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
        toast.success("Cursă finalizată!");
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
        toast.info("Cursă anulată.");
      } else if (updatedTrip.status === "in_desfasurare") {
        toast.success("Cursă pornită!");
      }
      loadData();
    },
    [loadData],
  );

  const handleEdit = React.useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setDialogOpen(true);
  }, []);

  const columns = React.useMemo(
    () =>
      buildColumns(
        orders,
        drivers,
        trucks,
        data,
        handleStatusChange,
        handleEdit,
      ),
    [orders, drivers, trucks, data, handleStatusChange, handleEdit],
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

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: {
      orderId: "",
      driverId: "",
      truckId: "",
      departureDate: today,
      estimatedArrivalDate: today,
      kmLoaded: 0,
      kmEmpty: 0,
      fuelCost: 0,
      status: "planned",
    },
  });

  React.useEffect(() => {
    if (dialogOpen && editingTrip) {
      form.reset({
        orderId: editingTrip.orderId,
        driverId: editingTrip.driverId,
        truckId: editingTrip.truckId,
        departureDate: editingTrip.departureDate,
        estimatedArrivalDate: editingTrip.estimatedArrivalDate,
        kmLoaded: editingTrip.kmLoaded,
        kmEmpty: editingTrip.kmEmpty,
        fuelCost: editingTrip.fuelCost,
        status: editingTrip.status,
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
        status: "planned",
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
        };
        updateItem<Trip>(
          STORAGE_KEYS.trips,
          (t) => t.id === editingTrip.id,
          () => updatedTrip,
        );
        toast.success("Cursă actualizată cu succes!");
      } else {
        const newTrip: Trip = {
          id: generateId(),
          ...values,
          status: "planned",
          kmLoaded: Number(values.kmLoaded),
          kmEmpty: Number(values.kmEmpty),
          fuelCost: Number(values.fuelCost),
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
        toast.success("Cursă adăugată cu succes!");
      }
      loadData();
      handleCloseDialog();
    } catch {
      toast.error("A apărut o eroare. Încearcă din nou.");
    }
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Curse Zilnice</h1>
      </Header>

      <Main>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base md:text-lg">Tabel Curse</CardTitle>
            <div className="flex items-center gap-2">
              <ExportMenu
                trips={data}
                orders={orders}
                drivers={drivers}
                trucks={trucks}
              />
              <Button
                onClick={() => {
                  setEditingTrip(null);
                  setDialogOpen(true);
                }}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Cursă nouă</span>
                <span className="sm:hidden">Nou</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="Caută curse..."
              searchKey="orderId"
              filters={[
                {
                  columnId: "status",
                  title: "Status",
                  options: statusFilterOptions,
                },
              ]}
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
                        className="rounded-lg border p-4 space-y-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {order?.clientName ?? trip.orderId}
                          </div>
                          <StatusBadge status={trip.status} />
                        </div>
                        {order && (
                          <div className="text-xs text-muted-foreground">
                            {order.origin} → {order.destination}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>
                            Șofer:{" "}
                            <span className="text-foreground">
                              {driver?.name ?? "—"}
                            </span>
                          </span>
                          <span>
                            Data plecare:{" "}
                            <span className="text-foreground">
                              {trip.departureDate}
                            </span>
                          </span>
                          <span>
                            Sosire estimată:{" "}
                            <span className="text-foreground">
                              {trip.estimatedArrivalDate}
                            </span>
                          </span>
                          <span>
                            Km încărcat:{" "}
                            <span className="text-foreground">
                              {trip.kmLoaded} km
                            </span>
                          </span>
                          <span>
                            Km gol:{" "}
                            <span className="text-foreground">
                              {trip.kmEmpty} km
                            </span>
                          </span>
                          <span>
                            Cost combustibil:{" "}
                            <span className="text-foreground">
                              {trip.fuelCost} RON
                            </span>
                          </span>
                        </div>
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleEdit(trip)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Editează
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
                                Pornește
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
                                Anulează
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
                              Finalizează
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                    Nu există curse. Apasă „Cursă nouă" pentru a adăuga.
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
                          Nu există curse. Apasă „Cursă nouă" pentru a adăuga.
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
        <DialogContent className="w-full max-w-[580px]">
          <DialogHeader>
            <DialogTitle>
              {editingTrip ? "Editează cursă" : "Cursă nouă"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingTrip
                ? "Modifică detaliile cursei existente."
                : "Completează detaliile pentru o cursă nouă."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Comandă</Label>
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
                              <SelectValue placeholder="Selectează o comandă" />
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
                    <Label>Șofer</Label>
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
                                <SelectValue placeholder="Selectează șofer" />
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
                    <Label>Camion</Label>
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
                                <SelectValue placeholder="Selectează camion" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              {trucks
                                .filter(
                                  (t) =>
                                    t.status === "available" ||
                                    (editingTrip &&
                                      t.id === editingTrip.truckId),
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 min-w-0">
                    <Label>Data plecare</Label>
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
                    <Label>Sosire estimată</Label>
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

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_1fr_1.4fr]">
                  <div className="grid gap-1.5 min-w-0">
                    <Label>Km încărcat</Label>
                    <FormField
                      control={form.control}
                      name="kmLoaded"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="0"
                              className="w-full min-w-0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0">
                    <Label>Km gol</Label>
                    <FormField
                      control={form.control}
                      name="kmEmpty"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="0"
                              className="w-full min-w-0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0 col-span-2 sm:col-span-1">
                    <Label>Cost combustibil (RON)</Label>
                    <FormField
                      control={form.control}
                      name="fuelCost"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              className="w-full min-w-0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
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
                    <Label>Status</Label>
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
                                <SelectValue placeholder="Selectează status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">
                                Planificată
                              </SelectItem>
                              <SelectItem value="in_desfasurare">
                                În desfășurare
                              </SelectItem>
                              <SelectItem value="finalizata">
                                Finalizată
                              </SelectItem>
                              <SelectItem value="anulata">Anulată</SelectItem>
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
                  Anulează
                </Button>
                <Button type="submit">
                  {editingTrip ? "Salvează modificările" : "Adaugă cursă"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
