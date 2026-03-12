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
import { toast } from "sonner";
import { PlusCircle, Play, CheckCircle } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  planned: { label: "Planificată", variant: "secondary" },
  active: { label: "Activă", variant: "default" },
  completed: { label: "Finalizată", variant: "outline" },
};

const statusFilterOptions = (Object.keys(statusMeta) as Trip["status"][]).map(
  (value) => ({ value, label: statusMeta[value].label }),
);

type TripFormValues = {
  orderId: string;
  driverId: string;
  truckId: string;
  date: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  status: "planned" | "active" | "completed";
};

function buildColumns(
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
  onStatusChange: (trip: Trip) => void,
): ColumnDef<Trip>[] {
  return [
    {
      accessorKey: "orderId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Comandă" />
      ),
      cell: ({ row }) => {
        const order = orders.find((o) => o.id === row.getValue("orderId"));
        return (
          <div className="font-medium text-sm">
            {order ? `${order.clientName}` : row.getValue("orderId")}
            {order && (
              <div className="text-xs text-muted-foreground">
                {order.origin} → {order.destination}
              </div>
            )}
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
        return <div>{driver?.name ?? row.getValue("driverId")}</div>;
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
          <div>
            {truck
              ? `${truck.plateNumber} (${truck.brand} ${truck.model})`
              : row.getValue("truckId")}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Dată" />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums">{row.getValue("date")}</div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: "kmLoaded",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Km încărcat" />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right">
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
        <div className="tabular-nums text-right">
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
        <div className="tabular-nums text-right">
          {(row.getValue("fuelCost") as number).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 150,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const value = row.getValue("status") as Trip["status"];
        const meta = statusMeta[value];
        return (
          <Badge variant={meta.variant ?? "secondary"} className="whitespace-nowrap">
            {meta.label}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        if (!selected || selected.length === 0) return true;
        return selected.includes(row.getValue(id));
      },
      size: 130,
    },
    {
      id: "actions",
      header: () => <div className="text-center text-xs">Acțiuni</div>,
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-center gap-2">
            {trip.status === "planned" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => onStatusChange({ ...trip, status: "active" })}
              >
                <Play className="mr-1 h-3 w-3" />
                Pornește
              </Button>
            )}
            {trip.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => onStatusChange({ ...trip, status: "completed" })}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Finalizează
              </Button>
            )}
            {trip.status === "completed" && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        );
      },
      size: 130,
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

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

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
        kmLoaded: false,
        kmEmpty: false,
        fuelCost: false,
      });
    } else if (isTablet) {
      setColumnVisibility({
        truckId: false,
        kmEmpty: false,
        fuelCost: false,
      });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile, isTablet]);

  function handleStatusChange(updatedTrip: Trip) {
    updateItem<Trip>(
      STORAGE_KEYS.trips,
      (t) => t.id === updatedTrip.id,
      () => updatedTrip,
    );

    if (updatedTrip.status === "completed") {
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
    } else {
      toast.success("Cursă pornită!");
    }

    loadData();
  }

  const columns = React.useMemo(
    () => buildColumns(orders, drivers, trucks, handleStatusChange),
    [orders, drivers, trucks],
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

  const form = useForm<TripFormValues>({
    defaultValues: {
      orderId: "",
      driverId: "",
      truckId: "",
      date: new Date().toISOString().split("T")[0],
      kmLoaded: 0,
      kmEmpty: 0,
      fuelCost: 0,
      status: "planned",
    },
  });

  function onSubmit(values: TripFormValues) {
    if (!values.orderId) { form.setError("orderId", { message: "Selectează o comandă" }); return; }
    if (!values.driverId) { form.setError("driverId", { message: "Selectează un șofer" }); return; }
    if (!values.truckId) { form.setError("truckId", { message: "Selectează un camion" }); return; }
    if (!values.date) { form.setError("date", { message: "Data este obligatorie" }); return; }

    const newTrip: Trip = {
      id: generateId(),
      ...values,
      kmLoaded: Number(values.kmLoaded),
      kmEmpty: Number(values.kmEmpty),
      fuelCost: Number(values.fuelCost),
    };
    addItem<Trip>(STORAGE_KEYS.trips, newTrip);

    updateItem<Order>(
      STORAGE_KEYS.orders,
      (o) => o.id === values.orderId,
      (o) => ({ ...o, status: "assigned" }),
    );

    updateItem<Driver>(
      STORAGE_KEYS.drivers,
      (d) => d.id === values.driverId,
      (d) => ({ ...d, status: "on_trip" }),
    );

    loadData();
    setDialogOpen(false);
    form.reset();
    toast.success("Cursă adăugată cu succes!");
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
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Cursă nouă</span>
              <span className="sm:hidden">Nou</span>
            </Button>
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

            {/* ── Mobile: Cards ── */}
            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const trip = row.original;
                    const order = orders.find((o) => o.id === trip.orderId);
                    const driver = drivers.find((d) => d.id === trip.driverId);
                    const meta = statusMeta[trip.status];
                    return (
                      <div key={trip.id} className="rounded-lg border p-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {order?.clientName ?? trip.orderId}
                          </div>
                          <Badge variant={meta.variant ?? "secondary"}>
                            {meta.label}
                          </Badge>
                        </div>
                        {order && (
                          <div className="text-xs text-muted-foreground">
                            {order.origin} → {order.destination}
                          </div>
                        )}
                        {/* ✅ Fix mobile: flex-col în loc de grid-cols-2 */}
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>Șofer: <span className="text-foreground">{driver?.name ?? "—"}</span></span>
                          <span>Data: <span className="text-foreground">{trip.date}</span></span>
                          <span>Km încărcat: <span className="text-foreground">{trip.kmLoaded} km</span></span>
                          <span>Km gol: <span className="text-foreground">{trip.kmEmpty} km</span></span>
                          <span>Cost combustibil: <span className="text-foreground">{trip.fuelCost} RON</span></span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          {trip.status === "planned" && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => handleStatusChange({ ...trip, status: "active" })}>
                              <Play className="mr-1 h-3 w-3" /> Pornește
                            </Button>
                          )}
                          {trip.status === "active" && (
                            <Button size="sm" variant="outline"
                              className="h-7 px-2 text-xs text-green-600 border-green-600"
                              onClick={() => handleStatusChange({ ...trip, status: "completed" })}>
                              <CheckCircle className="mr-1 h-3 w-3" /> Finalizează
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
              /* ── Tablet + Desktop: Tabel ── */
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
                            <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
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

            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      {/* ── Dialog: Adaugă cursă nouă ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cursă nouă</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comandă</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează o comandă" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orders
                          .filter((o) => o.status === "pending" || o.status === "assigned")
                          .map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.clientName} — {order.origin} → {order.destination}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Șofer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează un șofer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers
                          .filter((d) => d.status === "available")
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

              <FormField
                control={form.control}
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camion</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează un camion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks
                          .filter((t) => t.status === "available")
                          .map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.plateNumber} — {truck.brand} {truck.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dată</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kmLoaded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Km încărcat</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kmEmpty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Km gol</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fuelCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost combustibil (RON)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planificată</SelectItem>
                        <SelectItem value="active">Activă</SelectItem>
                        <SelectItem value="completed">Finalizată</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Anulează
                </Button>
                <Button type="submit">Adaugă cursă</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}