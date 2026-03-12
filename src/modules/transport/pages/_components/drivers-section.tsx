// ──────────────────────────────────────────────────────────
// DriversSection — card Șoferi cu tabel, CRUD și dialog
// ──────────────────────────────────────────────────────────

import * as React from "react";
import {
  type ColumnDef,
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

import { DataTableColumnHeader } from "@/components/data-table/column-header";

import type { Driver, Truck } from "@/modules/transport/types";
import { addItem, generateId, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";

import { CardRow, EntityTable, ExpiryCell } from "./transport-shared";

// ── Constante ──────────────────────────────────────────────

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

const statusFilterOptions = (Object.keys(DRIVER_STATUS_LABELS) as Driver["status"][]).map(
  (value) => ({ value, label: DRIVER_STATUS_LABELS[value] }),
);

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

const EMPTY_FORM: DriverFormData = {
  name: "",
  phone: "",
  licenseExpiry: "",
  status: "available",
  truckId: "",
};

// ── DriverMobileCard ───────────────────────────────────────

function DriverMobileCard({
  driver,
  truck,
  onEdit,
  onDelete,
}: {
  driver: Driver;
  truck?: Truck;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{driver.name}</p>
          <p className="text-xs text-muted-foreground">{driver.phone}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editează șofer">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Șterge șofer"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label="Status">
          <Badge variant="outline" className={DRIVER_STATUS_CLASS[driver.status]}>
            {DRIVER_STATUS_LABELS[driver.status]}
          </Badge>
        </CardRow>
        <CardRow label="Exp. Permis">
          <ExpiryCell dateStr={driver.licenseExpiry} />
        </CardRow>
        <CardRow label="Camion">
          {truck
            ? <span>{truck.plateNumber}</span>
            : <span className="text-muted-foreground">—</span>}
        </CardRow>
      </div>
    </div>
  );
}

// ── DriverDialog ───────────────────────────────────────────

function DriverDialog({
  open,
  onOpenChange,
  editingDriver,
  form,
  errors,
  trucks,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: Driver | null;
  form: DriverFormData;
  errors: DriverFormErrors;
  trucks: Truck[];
  onFormChange: (patch: Partial<DriverFormData>) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDriver ? "Editează Șofer" : "Adaugă Șofer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="name">Nume complet</Label>
            <Input
              id="name"
              placeholder="ex. Ion Popescu"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              placeholder="07XXXXXXXX"
              value={form.phone}
              onChange={(e) => onFormChange({ phone: e.target.value })}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="licenseExpiry">Expirare Permis</Label>
            <Input
              id="licenseExpiry"
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => onFormChange({ licenseExpiry: e.target.value })}
            />
            {errors.licenseExpiry && (
              <p className="text-xs text-red-500">{errors.licenseExpiry}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(val) => onFormChange({ status: val as Driver["status"] })}
            >
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
              value={form.truckId || "none"}
              onValueChange={(val) => onFormChange({ truckId: val === "none" ? "" : val })}
            >
              <SelectTrigger id="truck"><SelectValue placeholder="Fără camion" /></SelectTrigger>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={onSubmit}>{editingDriver ? "Salvează" : "Adaugă"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DriversSection ─────────────────────────────────────────

export function DriversSection({
  drivers,
  trucks,
  onDataChange,
}: {
  drivers: Driver[];
  trucks: Truck[];
  onDataChange: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useDialogState();
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [form, setForm] = React.useState<DriverFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<DriverFormErrors>({});
  const [deleteDriverId, setDeleteDriverId] = React.useState<string | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const getTruck = React.useCallback(
    (driver: Driver) => driver.truckId ? trucks.find((t) => t.id === driver.truckId) : undefined,
    [trucks],
  );

  // ── Handlers ──

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      phone: driver.phone,
      licenseExpiry: driver.licenseExpiry,
      status: driver.status,
      truckId: driver.truckId ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const errs = validateDriverForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const newTruckId = form.truckId || undefined;
    if (newTruckId) {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.truckId === newTruckId && d.id !== (editingDriver?.id ?? ""),
        (d) => ({ ...d, truckId: undefined }),
      );
    }

    if (editingDriver) {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.id === editingDriver.id,
        (d) => ({
          ...d,
          name: form.name.trim(),
          phone: form.phone.trim(),
          licenseExpiry: form.licenseExpiry,
          status: form.status,
          truckId: newTruckId,
        }),
      );
      toast.success("Șoferul a fost actualizat.");
    } else {
      addItem<Driver>(STORAGE_KEYS.drivers, {
        id: generateId(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        licenseExpiry: form.licenseExpiry,
        status: form.status,
        truckId: newTruckId,
      });
      toast.success("Șoferul a fost adăugat.");
    }
    setDialogOpen(false);
    onDataChange();
  };

  const handleDelete = () => {
    if (!deleteDriverId) return;
    removeItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === deleteDriverId);
    toast.success("Șoferul a fost șters.");
    setDeleteDriverId(null);
    onDataChange();
  };

  // ── Coloane ──

  const columns: ColumnDef<Driver>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nume" />,
      cell: ({ row }) => {
        const truck = getTruck(row.original);
        return (
          <div className="font-medium">
            <div>{row.getValue("name")}</div>
            {truck && (
              <div className="text-xs text-muted-foreground lg:hidden">{truck.plateNumber}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Telefon" />,
      cell: ({ row }) => <div>{row.getValue("phone")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "licenseExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Exp. Permis" />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("licenseExpiry")} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Driver["status"];
        return (
          <Badge variant="outline" className={`whitespace-nowrap ${DRIVER_STATUS_CLASS[status]}`}>
            {DRIVER_STATUS_LABELS[status]}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        return !selected || selected.length === 0 || selected.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "truckId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Camion" />,
      cell: ({ row }) => {
        const truck = getTruck(row.original);
        return (
          <div className="text-sm text-muted-foreground">{truck ? truck.plateNumber : "—"}</div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acțiuni</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row.original)} aria-label="Editează șofer">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDriverId(row.original.id)}
            aria-label="Șterge șofer"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [trucks]);

  const table = useReactTable({
    data: drivers,
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
    initialState: { pagination: { pageSize: 10 } },
  });

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Șoferi</CardTitle>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adaugă
          </Button>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table}
            columns={columns}
            searchPlaceholder="Caută șoferi..."
            searchKey="name"
            filterConfig={[{ columnId: "status", title: "Status", options: statusFilterOptions }]}
            columnVisibilityClass={{
              phone: "hidden md:table-cell",
              truckId: "hidden lg:table-cell",
            }}
            emptyText="Nu există șoferi pentru filtrul curent."
            renderMobileCard={(driver) => (
              <DriverMobileCard
                driver={driver}
                truck={getTruck(driver)}
                onEdit={() => handleOpenEdit(driver)}
                onDelete={() => setDeleteDriverId(driver.id)}
              />
            )}
          />
        </CardContent>
      </Card>

      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingDriver={editingDriver}
        form={form}
        errors={errors}
        trucks={trucks}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleSubmit}
      />

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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}