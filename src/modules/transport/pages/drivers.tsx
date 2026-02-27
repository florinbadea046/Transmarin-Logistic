// ──────────────────────────────────────────────────────────
// Transport → Sub-pagină: Șoferi & Camioane
// Branch: task-A6-drivers-trucks-responsive
//
// Implementat:
//   - TanStack Table pentru șoferi și camioane (sorting, filtrare, paginare)
//   - CRUD șoferi (adăugare/editare/ștergere cu confirmare)
//   - Asociere șofer ↔ camion
//   - Alertă vizuală expirări (permis, ITP, RCA, vignetă)
//   - Responsive: coloane secundare ascunse pe mobil/tabletă
// ──────────────────────────────────────────────────────────

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
import { AlertTriangle, Link, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Driver, Truck } from "@/modules/transport/types";
import {
  addItem,
  generateId,
  getCollection,
  removeItem,
  updateItem,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

// ── Helpers ────────────────────────────────────────────────

const DRIVER_STATUS_LABELS: Record<Driver["status"], string> = {
  available: "Disponibil",
  on_trip: "În cursă",
  off_duty: "Liber",
};

const DRIVER_STATUS_CLASS: Record<Driver["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  off_duty: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const TRUCK_STATUS_LABELS: Record<Truck["status"], string> = {
  available: "Disponibil",
  on_trip: "În cursă",
  in_service: "În service",
};

const TRUCK_STATUS_CLASS: Record<Truck["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
};

const driverStatusFilterOptions = (
  Object.keys(DRIVER_STATUS_LABELS) as Driver["status"][]
).map((value) => ({ value, label: DRIVER_STATUS_LABELS[value] }));

const truckStatusFilterOptions = (
  Object.keys(TRUCK_STATUS_LABELS) as Truck["status"][]
).map((value) => ({ value, label: TRUCK_STATUS_LABELS[value] }));

function daysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ro-RO");
}

function ExpiryCell({ dateStr }: { dateStr: string }) {
  const days = daysUntilExpiry(dateStr);
  const isSoon = days <= 30;
  return (
    <span className={isSoon ? "font-semibold text-yellow-700 dark:text-yellow-400" : ""}>
      {formatDate(dateStr)}
      {isSoon && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
    </span>
  );
}

// ── Tipuri formular ────────────────────────────────────────

interface DriverFormData {
  name: string;
  phone: string;
  licenseExpiry: string;
  status: Driver["status"];
  truckId: string;
}

interface DriverFormErrors {
  name?: string;
  phone?: string;
  licenseExpiry?: string;
}

const PHONE_RO_REGEX = /^07[0-9]{8}$/;

function validateDriverForm(data: DriverFormData): DriverFormErrors {
  const errors: DriverFormErrors = {};
  if (!data.name || data.name.trim().length < 3)
    errors.name = "Numele trebuie să aibă minim 3 caractere.";
  if (!data.phone || !PHONE_RO_REGEX.test(data.phone.trim()))
    errors.phone = "Telefon invalid. Format acceptat: 07XXXXXXXX";
  if (!data.licenseExpiry)
    errors.licenseExpiry = "Data expirării permisului este obligatorie.";
  return errors;
}

const EMPTY_DRIVER_FORM: DriverFormData = {
  name: "",
  phone: "",
  licenseExpiry: "",
  status: "available",
  truckId: "",
};

// ── Componentă principală ──────────────────────────────────

export default function DriversPage() {
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);

  // State dialog șofer
  const [driverDialogOpen, setDriverDialogOpen] = React.useState(false);
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [driverForm, setDriverForm] = React.useState<DriverFormData>(EMPTY_DRIVER_FORM);
  const [driverErrors, setDriverErrors] = React.useState<DriverFormErrors>({});
  const [deleteDriverId, setDeleteDriverId] = React.useState<string | null>(null);

  // State dialog asociere
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [assigningTruck, setAssigningTruck] = React.useState<Truck | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>("");

  // TanStack state — șoferi
  const [driverSorting, setDriverSorting] = React.useState<SortingState>([]);
  const [driverFilters, setDriverFilters] = React.useState<ColumnFiltersState>([]);
  const [driverVisibility, setDriverVisibility] = React.useState<VisibilityState>({});

  // TanStack state — camioane
  const [truckSorting, setTruckSorting] = React.useState<SortingState>([]);
  const [truckFilters, setTruckFilters] = React.useState<ColumnFiltersState>([]);
  const [truckVisibility, setTruckVisibility] = React.useState<VisibilityState>({});

  const loadData = () => {
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const expiringDrivers = drivers.filter((d) => daysUntilExpiry(d.licenseExpiry) <= 30);
  const expiringTrucks = trucks.filter(
    (t) =>
      daysUntilExpiry(t.itpExpiry) <= 30 ||
      daysUntilExpiry(t.rcaExpiry) <= 30 ||
      daysUntilExpiry(t.vignetteExpiry) <= 30,
  );

  const getTruckForDriver = React.useCallback(
    (driver: Driver) =>
      driver.truckId ? trucks.find((t) => t.id === driver.truckId) : undefined,
    [trucks],
  );

  const getDriverForTruck = React.useCallback(
    (truck: Truck) => drivers.find((d) => d.truckId === truck.id),
    [drivers],
  );

  // ── CRUD Șoferi ──

  const handleOpenAddDriver = () => {
    setEditingDriver(null);
    setDriverForm(EMPTY_DRIVER_FORM);
    setDriverErrors({});
    setDriverDialogOpen(true);
  };

  const handleOpenEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      licenseExpiry: driver.licenseExpiry,
      status: driver.status,
      truckId: driver.truckId ?? "",
    });
    setDriverErrors({});
    setDriverDialogOpen(true);
  };

  const handleSubmitDriver = () => {
    const errors = validateDriverForm(driverForm);
    if (Object.keys(errors).length > 0) {
      setDriverErrors(errors);
      return;
    }

    if (editingDriver) {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.id === editingDriver.id,
        (d) => ({
          ...d,
          name: driverForm.name.trim(),
          phone: driverForm.phone.trim(),
          licenseExpiry: driverForm.licenseExpiry,
          status: driverForm.status,
          truckId: driverForm.truckId || undefined,
        }),
      );
      toast.success("Șoferul a fost actualizat.");
    } else {
      addItem<Driver>(STORAGE_KEYS.drivers, {
        id: generateId(),
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        licenseExpiry: driverForm.licenseExpiry,
        status: driverForm.status,
        truckId: driverForm.truckId || undefined,
      });
      toast.success("Șoferul a fost adăugat.");
    }

    setDriverDialogOpen(false);
    loadData();
  };

  const handleDeleteDriver = () => {
    if (!deleteDriverId) return;
    removeItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === deleteDriverId);
    toast.success("Șoferul a fost șters.");
    setDeleteDriverId(null);
    loadData();
  };

  // ── Asociere șofer ↔ camion ──

  const handleOpenAssign = (truck: Truck) => {
    setAssigningTruck(truck);
    const currentDriver = drivers.find((d) => d.truckId === truck.id);
    setSelectedDriverId(currentDriver?.id ?? "");
    setAssignDialogOpen(true);
  };

  const handleSubmitAssign = () => {
    if (!assigningTruck) return;

    drivers.forEach((d) => {
      if (d.truckId === assigningTruck.id) {
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (dr) => dr.id === d.id,
          (dr) => ({ ...dr, truckId: undefined }),
        );
      }
    });

    if (selectedDriverId && selectedDriverId !== "none") {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.id === selectedDriverId,
        (d) => ({ ...d, truckId: assigningTruck.id }),
      );
      toast.success("Asocierea a fost salvată.");
    } else {
      toast.success("Camionul a fost dezasociat.");
    }

    setAssignDialogOpen(false);
    loadData();
  };

  // ── Coloane TanStack — Șoferi ──
  const driverColumns: ColumnDef<Driver>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nume" />
        ),
        cell: ({ row }) => {
          const truck = getTruckForDriver(row.original);
          return (
            <div className="font-medium">
              <div>{row.getValue("name")}</div>
              <div className="text-xs text-muted-foreground md:hidden">
                {row.original.phone}
              </div>
              {truck && (
                <div className="text-xs text-muted-foreground lg:hidden">
                  {truck.plateNumber}
                </div>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Telefon" />
        ),
        cell: ({ row }) => <div>{row.getValue("phone")}</div>,
        enableSorting: false,
      },
      {
        accessorKey: "licenseExpiry",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Exp. Permis" />
        ),
        cell: ({ row }) => (
          <ExpiryCell dateStr={row.getValue("licenseExpiry")} />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as Driver["status"];
          return (
            <Badge variant="outline" className={DRIVER_STATUS_CLASS[status]}>
              <span className="md:hidden">
                {status === "available" ? "Disp." :
                 status === "on_trip" ? "Cursă" : "Liber"}
              </span>
              <span className="hidden md:inline">
                {DRIVER_STATUS_LABELS[status]}
              </span>
            </Badge>
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => {
          const selected = value as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "truckId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Camion" />
        ),
        cell: ({ row }) => {
          const truck = getTruckForDriver(row.original);
          return (
            <div className="text-sm text-muted-foreground">
              {truck ? truck.plateNumber : "—"}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acțiuni</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEditDriver(row.original)}
              title="Editează"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDriverId(row.original.id)}
              title="Șterge"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [trucks, drivers],
  );

  // ── Coloane TanStack — Camioane ──
  const truckColumns: ColumnDef<Truck>[] = React.useMemo(
    () => [
      {
        accessorKey: "plateNumber",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Camion" />
        ),
        cell: ({ row }) => {
          const driver = getDriverForTruck(row.original);
          return (
            <div className="font-medium">
              <div>{row.getValue("plateNumber")}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.brand} {row.original.model}
                <span className="hidden md:inline"> ({row.original.year})</span>
              </div>
              {driver && (
                <div className="text-xs text-muted-foreground lg:hidden">
                  {driver.name}
                </div>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as Truck["status"];
          return (
            <Badge variant="outline" className={TRUCK_STATUS_CLASS[status]}>
              <span className="md:hidden">
                {status === "available" ? "Disp." :
                 status === "on_trip" ? "Cursă" : "Serv."}
              </span>
              <span className="hidden md:inline">
                {TRUCK_STATUS_LABELS[status]}
              </span>
            </Badge>
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => {
          const selected = value as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "itpExpiry",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ITP" />
        ),
        cell: ({ row }) => <ExpiryCell dateStr={row.getValue("itpExpiry")} />,
        enableSorting: true,
      },
      {
        accessorKey: "rcaExpiry",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="RCA" />
        ),
        cell: ({ row }) => <ExpiryCell dateStr={row.getValue("rcaExpiry")} />,
        enableSorting: true,
      },
      {
        accessorKey: "vignetteExpiry",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Vignetă" />
        ),
        cell: ({ row }) => (
          <ExpiryCell dateStr={row.getValue("vignetteExpiry")} />
        ),
        enableSorting: true,
      },
      {
        id: "driverName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Șofer" />
        ),
        cell: ({ row }) => {
          const driver = getDriverForTruck(row.original);
          return (
            <div className="text-sm text-muted-foreground">
              {driver ? driver.name : "—"}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "assign",
        header: () => <div className="text-right">Asociere</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenAssign(row.original)}
              title="Asociere șofer"
            >
              <Link className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [drivers, trucks],
  );

  // ── TanStack Table instances ──

  const driverTable = useReactTable({
    data: drivers,
    columns: driverColumns,
    state: { sorting: driverSorting, columnFilters: driverFilters, columnVisibility: driverVisibility },
    onSortingChange: setDriverSorting,
    onColumnFiltersChange: setDriverFilters,
    onColumnVisibilityChange: setDriverVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const truckTable = useReactTable({
    data: trucks,
    columns: truckColumns,
    state: { sorting: truckSorting, columnFilters: truckFilters, columnVisibility: truckVisibility },
    onSortingChange: setTruckSorting,
    onColumnFiltersChange: setTruckFilters,
    onColumnVisibilityChange: setTruckVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Șoferi & Camioane</h1>
      </Header>

      <Main>
        {/* Alerte expirări */}
        {(expiringDrivers.length > 0 || expiringTrucks.length > 0) && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
            <div className="flex items-start gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-2">
                {expiringDrivers.length > 0 && (
                  <div>
                    <p className="font-medium">Permise de conducere expirate sau care expiră curând:</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {expiringDrivers.map((d) => {
                        const days = daysUntilExpiry(d.licenseExpiry);
                        return (
                          <li key={d.id}>
                            <span className="font-medium">{d.name}</span> —{" "}
                            {days <= 0
                              ? "permis EXPIRAT"
                              : `expiră în ${days} zi${days === 1 ? "" : "le"} (${formatDate(d.licenseExpiry)})`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {expiringTrucks.length > 0 && (
                  <div>
                    <p className="font-medium">Documente camion expirate sau care expiră curând:</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {expiringTrucks.map((t) => (
                        <li key={t.id}>
                          <span className="font-medium">{t.plateNumber}</span> —{" "}
                          {daysUntilExpiry(t.itpExpiry) <= 30 && `ITP expiră ${formatDate(t.itpExpiry)} `}
                          {daysUntilExpiry(t.rcaExpiry) <= 30 && `RCA expiră ${formatDate(t.rcaExpiry)} `}
                          {daysUntilExpiry(t.vignetteExpiry) <= 30 && `Vignetă expiră ${formatDate(t.vignetteExpiry)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Card Șoferi ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Șoferi</CardTitle>
              <Button onClick={handleOpenAddDriver} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adaugă
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTableToolbar
                table={driverTable}
                searchPlaceholder="Caută șoferi..."
                searchKey="name"
                filters={[
                  {
                    columnId: "status",
                    title: "Status",
                    options: driverStatusFilterOptions,
                  },
                ]}
              />
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    {driverTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={
                              header.column.id === "phone"
                                ? "hidden md:table-cell"
                                : header.column.id === "truckId"
                                ? "hidden lg:table-cell"
                                : undefined
                            }
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
                    {driverTable.getRowModel().rows?.length ? (
                      driverTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={
                                cell.column.id === "phone"
                                  ? "hidden md:table-cell"
                                  : cell.column.id === "truckId"
                                  ? "hidden lg:table-cell"
                                  : undefined
                              }
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
                          colSpan={driverColumns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nu există șoferi pentru filtrul curent.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={driverTable} pageSizes={[5, 10, 20]} />
            </CardContent>
          </Card>

          {/* ── Card Camioane ── */}
          <Card>
            <CardHeader>
              <CardTitle>Camioane</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTableToolbar
                table={truckTable}
                searchPlaceholder="Caută camioane..."
                searchKey="plateNumber"
                filters={[
                  {
                    columnId: "status",
                    title: "Status",
                    options: truckStatusFilterOptions,
                  },
                ]}
              />
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    {truckTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={
                              header.column.id === "rcaExpiry" ||
                              header.column.id === "vignetteExpiry"
                                ? "hidden md:table-cell"
                                : header.column.id === "driverName"
                                ? "hidden lg:table-cell"
                                : undefined
                            }
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
                    {truckTable.getRowModel().rows?.length ? (
                      truckTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={
                                cell.column.id === "rcaExpiry" ||
                                cell.column.id === "vignetteExpiry"
                                  ? "hidden md:table-cell"
                                  : cell.column.id === "driverName"
                                  ? "hidden lg:table-cell"
                                  : undefined
                              }
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
                          colSpan={truckColumns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nu există camioane pentru filtrul curent.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={truckTable} pageSizes={[5, 10, 20]} />
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* ── Dialog Adăugare / Editare Șofer ── */}
      <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? "Editează Șofer" : "Adaugă Șofer"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nume complet</Label>
              <Input
                id="name"
                placeholder="ex. Ion Popescu"
                value={driverForm.name}
                onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
              />
              {driverErrors.name && <p className="text-xs text-red-500">{driverErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                placeholder="07XXXXXXXX"
                value={driverForm.phone}
                onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))}
              />
              {driverErrors.phone && <p className="text-xs text-red-500">{driverErrors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="licenseExpiry">Expirare Permis</Label>
              <Input
                id="licenseExpiry"
                type="date"
                value={driverForm.licenseExpiry}
                onChange={(e) => setDriverForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
              />
              {driverErrors.licenseExpiry && <p className="text-xs text-red-500">{driverErrors.licenseExpiry}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select
                value={driverForm.status}
                onValueChange={(val) => setDriverForm((f) => ({ ...f, status: val as Driver["status"] }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponibil</SelectItem>
                  <SelectItem value="on_trip">În cursă</SelectItem>
                  <SelectItem value="off_duty">Liber</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="truck">Camion asociat</Label>
              <Select
                value={driverForm.truckId || "none"}
                onValueChange={(val) =>
                  setDriverForm((f) => ({ ...f, truckId: val === "none" ? "" : val }))
                }
              >
                <SelectTrigger id="truck">
                  <SelectValue placeholder="Fără camion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fără camion</SelectItem>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.plateNumber} — {truck.brand} {truck.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmitDriver}>
              {editingDriver ? "Salvează" : "Adaugă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Asociere Șofer ↔ Camion ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Asociere Șofer — {assigningTruck?.plateNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="assignDriver">Selectează șofer</Label>
              <Select
                value={selectedDriverId || "none"}
                onValueChange={(val) => setSelectedDriverId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="assignDriver">
                  <SelectValue placeholder="Fără șofer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fără șofer</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.truckId && driver.truckId !== assigningTruck?.id
                        ? " (are camion)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmitAssign}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Confirmare Ștergere ── */}
      <AlertDialog
        open={!!deleteDriverId}
        onOpenChange={(open) => !open && setDeleteDriverId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune este ireversibilă. Șoferul va fi șters definitiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              className="bg-red-600 hover:bg-red-700"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}