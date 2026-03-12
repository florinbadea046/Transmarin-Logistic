// ──────────────────────────────────────────────────────────
// TrucksSection — card Camioane cu tabel, CRUD complet
// și dialog asociere șofer ↔ camion.
// La ștergere camion, șoferul asociat este dezasociat automat.
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
import { Link, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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

// Regex număr înmatriculare: XX-NN-XXX (ex. CT-01-TML)
const PLATE_REGEX = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;

// ── Tipuri formular ────────────────────────────────────────

interface TruckFormData {
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  mileage: string;
  status: Truck["status"];
  itpExpiry: string;
  rcaExpiry: string;
  vignetteExpiry: string;
}

interface TruckFormErrors {
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: string;
  mileage?: string;
  itpExpiry?: string;
  rcaExpiry?: string;
  vignetteExpiry?: string;
}

const EMPTY_FORM: TruckFormData = {
  plateNumber: "",
  brand: "",
  model: "",
  year: "",
  mileage: "",
  status: "available",
  itpExpiry: "",
  rcaExpiry: "",
  vignetteExpiry: "",
};

// ── TruckMobileCard ────────────────────────────────────────

function TruckMobileCard({
  truck,
  driver,
  onEdit,
  onDelete,
  onAssign,
}: {
  truck: Truck;
  driver?: Driver;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  const { t } = useTranslation();

  const TRUCK_STATUS_CLASS: Record<Truck["status"], string> = {
    available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{truck.plateNumber}</p>
          <p className="text-xs text-muted-foreground">
            {truck.brand} {truck.model} ({truck.year})
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onAssign} aria-label={t("trucks.actions.assign")}>
            <Link className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("trucks.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label={t("trucks.actions.delete")}
            className="text-red-500 hover:text-red-600"
            disabled={truck.status === "on_trip"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label={t("trucks.card.status")}>
          <Badge variant="outline" className={TRUCK_STATUS_CLASS[truck.status]}>
            {t(`trucks.status.${truck.status}`)}
          </Badge>
        </CardRow>
        <CardRow label={t("trucks.card.driver")}>
          {driver
            ? <span>{driver.name}</span>
            : <span className="text-muted-foreground">—</span>}
        </CardRow>
        <CardRow label={t("trucks.card.mileage")}>
          <span>{truck.mileage.toLocaleString("ro-RO")}</span>
        </CardRow>
        <CardRow label={t("trucks.card.itp")}>
          <ExpiryCell dateStr={truck.itpExpiry} />
        </CardRow>
        <CardRow label={t("trucks.card.rca")}>
          <ExpiryCell dateStr={truck.rcaExpiry} />
        </CardRow>
        <CardRow label={t("trucks.card.vignette")}>
          <ExpiryCell dateStr={truck.vignetteExpiry} />
        </CardRow>
      </div>
    </div>
  );
}

// ── TruckDialog ────────────────────────────────────────────

function TruckDialog({
  open,
  onOpenChange,
  editingTruck,
  form,
  errors,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTruck: Truck | null;
  form: TruckFormData;
  errors: TruckFormErrors;
  onFormChange: (patch: Partial<TruckFormData>) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTruck ? t("trucks.edit") : t("trucks.add")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          {/* Număr înmatriculare — full width */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="plateNumber">{t("trucks.fields.plateNumber")}</Label>
            <Input
              id="plateNumber"
              placeholder={t("trucks.placeholders.plateNumber")}
              value={form.plateNumber}
              onChange={(e) => onFormChange({ plateNumber: e.target.value.toUpperCase() })}
            />
            {errors.plateNumber && (
              <p className="text-xs text-red-500">{errors.plateNumber}</p>
            )}
          </div>

          {/* Marcă */}
          <div className="space-y-1">
            <Label htmlFor="brand">{t("trucks.fields.brand")}</Label>
            <Input
              id="brand"
              placeholder={t("trucks.placeholders.brand")}
              value={form.brand}
              onChange={(e) => onFormChange({ brand: e.target.value })}
            />
            {errors.brand && (
              <p className="text-xs text-red-500">{errors.brand}</p>
            )}
          </div>

          {/* Model */}
          <div className="space-y-1">
            <Label htmlFor="model">{t("trucks.fields.model")}</Label>
            <Input
              id="model"
              placeholder={t("trucks.placeholders.model")}
              value={form.model}
              onChange={(e) => onFormChange({ model: e.target.value })}
            />
            {errors.model && (
              <p className="text-xs text-red-500">{errors.model}</p>
            )}
          </div>

          {/* An */}
          <div className="space-y-1">
            <Label htmlFor="year">{t("trucks.fields.year")}</Label>
            <Input
              id="year"
              type="number"
              placeholder={t("trucks.placeholders.year")}
              value={form.year}
              onChange={(e) => onFormChange({ year: e.target.value })}
            />
            {errors.year && (
              <p className="text-xs text-red-500">{errors.year}</p>
            )}
          </div>

          {/* Kilometraj */}
          <div className="space-y-1">
            <Label htmlFor="mileage">{t("trucks.fields.mileage")}</Label>
            <Input
              id="mileage"
              type="number"
              placeholder={t("trucks.placeholders.mileage")}
              value={form.mileage}
              onChange={(e) => onFormChange({ mileage: e.target.value })}
            />
            {errors.mileage && (
              <p className="text-xs text-red-500">{errors.mileage}</p>
            )}
          </div>

          {/* Status — full width */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="truckStatus">{t("trucks.fields.status")}</Label>
            <Select
              value={form.status}
              onValueChange={(val) => onFormChange({ status: val as Truck["status"] })}
            >
              <SelectTrigger id="truckStatus"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("trucks.status.available")}</SelectItem>
                <SelectItem value="on_trip">{t("trucks.status.on_trip")}</SelectItem>
                <SelectItem value="in_service">{t("trucks.status.in_service")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ITP */}
          <div className="space-y-1">
            <Label htmlFor="itpExpiry">{t("trucks.fields.itpExpiry")}</Label>
            <Input
              id="itpExpiry"
              type="date"
              value={form.itpExpiry}
              onChange={(e) => onFormChange({ itpExpiry: e.target.value })}
            />
            {errors.itpExpiry && (
              <p className="text-xs text-red-500">{errors.itpExpiry}</p>
            )}
          </div>

          {/* RCA */}
          <div className="space-y-1">
            <Label htmlFor="rcaExpiry">{t("trucks.fields.rcaExpiry")}</Label>
            <Input
              id="rcaExpiry"
              type="date"
              value={form.rcaExpiry}
              onChange={(e) => onFormChange({ rcaExpiry: e.target.value })}
            />
            {errors.rcaExpiry && (
              <p className="text-xs text-red-500">{errors.rcaExpiry}</p>
            )}
          </div>

          {/* Vignetă — full width */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="vignetteExpiry">{t("trucks.fields.vignetteExpiry")}</Label>
            <Input
              id="vignetteExpiry"
              type="date"
              value={form.vignetteExpiry}
              onChange={(e) => onFormChange({ vignetteExpiry: e.target.value })}
            />
            {errors.vignetteExpiry && (
              <p className="text-xs text-red-500">{errors.vignetteExpiry}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("trucks.cancel")}
          </Button>
          <Button onClick={onSubmit}>
            {editingTruck ? t("trucks.save") : t("trucks.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AssignDialog ───────────────────────────────────────────

function AssignDialog({
  open,
  onOpenChange,
  truck,
  drivers,
  selectedDriverId,
  onDriverChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  drivers: Driver[];
  selectedDriverId: string;
  onDriverChange: (id: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("trucks.assignTitle", { plateNumber: truck?.plateNumber ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="assignDriver">{t("trucks.assign.selectDriver")}</Label>
            <Select
              value={selectedDriverId || "none"}
              onValueChange={(val) => onDriverChange(val === "none" ? "" : val)}
            >
              <SelectTrigger id="assignDriver">
                <SelectValue placeholder={t("trucks.placeholders.selectDriver")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("trucks.placeholders.noDriver")}</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.truckId && driver.truckId !== truck?.id
                      ? t("trucks.assign.hasTrack")
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("trucks.actions.cancel")}
          </Button>
          <Button onClick={onSubmit}>{t("trucks.actions.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── TrucksSection ──────────────────────────────────────────

export function TrucksSection({
  drivers,
  trucks,
  onDataChange,
}: {
  drivers: Driver[];
  trucks: Truck[];
  onDataChange: () => void;
}) {
  const { t } = useTranslation();

  const TRUCK_STATUS_CLASS: Record<Truck["status"], string> = {
    available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  };

  const statusFilterOptions = (["available", "on_trip", "in_service"] as Truck["status"][]).map(
    (value) => ({ value, label: t(`trucks.status.${value}`) }),
  );

  // Dialog CRUD
  const [truckDialogOpen, setTruckDialogOpen] = useDialogState();
  const [editingTruck, setEditingTruck] = React.useState<Truck | null>(null);
  const [form, setForm] = React.useState<TruckFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<TruckFormErrors>({});
  const [deleteTruckId, setDeleteTruckId] = React.useState<string | null>(null);

  // Dialog asociere
  const [assignDialogOpen, setAssignDialogOpen] = useDialogState();
  const [assigningTruck, setAssigningTruck] = React.useState<Truck | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>("");

  // TanStack state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const getDriver = React.useCallback(
    (truck: Truck) => drivers.find((d) => d.truckId === truck.id),
    [drivers],
  );

  // ── Validation ──

  function validateTruckForm(data: TruckFormData): TruckFormErrors {
    const errs: TruckFormErrors = {};
    if (!data.plateNumber || !PLATE_REGEX.test(data.plateNumber.trim().toUpperCase()))
      errs.plateNumber = t("trucks.validation.plateNumberInvalid");
    if (!data.brand || data.brand.trim().length < 2)
      errs.brand = t("trucks.validation.brandMin");
    if (!data.model || data.model.trim().length < 1)
      errs.model = t("trucks.validation.modelRequired");
    const year = Number(data.year);
    const maxYear = new Date().getFullYear();
    if (!data.year || isNaN(year) || year < 1990 || year > maxYear)
      errs.year = t("trucks.validation.yearRange", { max: maxYear });
    const mileage = Number(data.mileage);
    if (!data.mileage || isNaN(mileage) || mileage < 0)
      errs.mileage = t("trucks.validation.mileagePositive");
    if (!data.itpExpiry)
      errs.itpExpiry = t("trucks.validation.itpExpiryRequired");
    if (!data.rcaExpiry)
      errs.rcaExpiry = t("trucks.validation.rcaExpiryRequired");
    if (!data.vignetteExpiry)
      errs.vignetteExpiry = t("trucks.validation.vignetteExpiryRequired");
    return errs;
  }

  // ── Handlers CRUD ──

  const handleOpenAdd = () => {
    setEditingTruck(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setTruckDialogOpen(true);
  };

  const handleOpenEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setForm({
      plateNumber: truck.plateNumber,
      brand: truck.brand,
      model: truck.model,
      year: String(truck.year),
      mileage: String(truck.mileage),
      status: truck.status,
      itpExpiry: truck.itpExpiry,
      rcaExpiry: truck.rcaExpiry,
      vignetteExpiry: truck.vignetteExpiry,
    });
    setErrors({});
    setTruckDialogOpen(true);
  };

  const handleSubmit = () => {
    const errs = validateTruckForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (editingTruck) {
      updateItem<Truck>(
        STORAGE_KEYS.trucks,
        (truck) => truck.id === editingTruck.id,
        (truck) => ({
          ...truck,
          plateNumber: form.plateNumber.trim().toUpperCase(),
          brand: form.brand.trim(),
          model: form.model.trim(),
          year: Number(form.year),
          mileage: Number(form.mileage),
          status: form.status,
          itpExpiry: form.itpExpiry,
          rcaExpiry: form.rcaExpiry,
          vignetteExpiry: form.vignetteExpiry,
        }),
      );
      toast.success(t("trucks.toastUpdated"));
    } else {
      addItem<Truck>(STORAGE_KEYS.trucks, {
        id: generateId(),
        plateNumber: form.plateNumber.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        mileage: Number(form.mileage),
        status: form.status,
        itpExpiry: form.itpExpiry,
        rcaExpiry: form.rcaExpiry,
        vignetteExpiry: form.vignetteExpiry,
      });
      toast.success(t("trucks.toastAdded"));
    }
    setTruckDialogOpen(false);
    onDataChange();
  };

  const handleDelete = () => {
    if (!deleteTruckId) return;

    // Dezasociază automat șoferul asociat acestui camion
    updateItem<Driver>(
      STORAGE_KEYS.drivers,
      (d) => d.truckId === deleteTruckId,
      (d) => ({ ...d, truckId: undefined }),
    );

    removeItem<Truck>(STORAGE_KEYS.trucks, (truck) => truck.id === deleteTruckId);
    toast.success(t("trucks.toastDeleted"));
    setDeleteTruckId(null);
    onDataChange();
  };

  // ── Handlers asociere ──

  const handleOpenAssign = (truck: Truck) => {
    setAssigningTruck(truck);
    setSelectedDriverId(drivers.find((d) => d.truckId === truck.id)?.id ?? "");
    setAssignDialogOpen(true);
  };

  const handleSubmitAssign = () => {
    if (!assigningTruck) return;
    updateItem<Driver>(
      STORAGE_KEYS.drivers,
      (d) => d.truckId === assigningTruck.id,
      (d) => ({ ...d, truckId: undefined }),
    );
    if (selectedDriverId && selectedDriverId !== "none") {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.id === selectedDriverId,
        (d) => ({ ...d, truckId: assigningTruck.id }),
      );
      toast.success(t("trucks.toastAssigned"));
    } else {
      toast.success(t("trucks.toastUnassigned"));
    }
    setAssignDialogOpen(false);
    onDataChange();
  };

  // ── Coloane ──

  const columns: ColumnDef<Truck>[] = React.useMemo(() => [
    {
      accessorKey: "plateNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.plateNumber")} />,
      cell: ({ row }) => {
        const driver = getDriver(row.original);
        return (
          <div className="font-medium">
            <div>{row.getValue("plateNumber")}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.brand} {row.original.model} ({row.original.year})
            </div>
            {driver && (
              <div className="text-xs text-muted-foreground lg:hidden">{driver.name}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.status")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Truck["status"];
        return (
          <Badge variant="outline" className={`whitespace-nowrap ${TRUCK_STATUS_CLASS[status]}`}>
            {t(`trucks.status.${status}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        return !selected || selected.length === 0 || selected.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "itpExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.itpExpiry")} />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("itpExpiry")} />,
    },
    {
      accessorKey: "rcaExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.rcaExpiry")} />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("rcaExpiry")} />,
    },
    {
      accessorKey: "vignetteExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.vignetteExpiry")} />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("vignetteExpiry")} />,
    },
    {
      id: "driverName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.driver")} />,
      cell: ({ row }) => {
        const driver = getDriver(row.original);
        return (
          <div className="text-sm text-muted-foreground">{driver ? driver.name : "—"}</div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("trucks.columns.actions")}</div>,
      cell: ({ row }) => {
        const truck = row.original;
        const isOnTrip = truck.status === "on_trip";
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenAssign(truck)}
              aria-label={t("trucks.actions.assign")}
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(truck)}
              aria-label={t("trucks.actions.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTruckId(truck.id)}
              aria-label={t("trucks.actions.delete")}
              className="text-red-500 hover:text-red-600"
              disabled={isOnTrip}
              title={isOnTrip ? t("trucks.deleteDisabledTooltip") : undefined}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [drivers, t]);

  const table = useReactTable({
    data: trucks,
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
          <CardTitle>{t("trucks.title")}</CardTitle>
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t("trucks.actions.add")}
          </Button>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table}
            columns={columns}
            searchPlaceholder={t("trucks.placeholders.search")}
            searchKey="plateNumber"
            filterConfig={[
              { columnId: "status", title: t("trucks.fields.status"), options: statusFilterOptions },
            ]}
            columnVisibilityClass={{
              rcaExpiry: "hidden md:table-cell",
              vignetteExpiry: "hidden md:table-cell",
              driverName: "hidden lg:table-cell",
            }}
            emptyText={t("trucks.noResults")}
            renderMobileCard={(truck) => (
              <TruckMobileCard
                truck={truck}
                driver={getDriver(truck)}
                onEdit={() => handleOpenEdit(truck)}
                onDelete={() => setDeleteTruckId(truck.id)}
                onAssign={() => handleOpenAssign(truck)}
              />
            )}
          />
        </CardContent>
      </Card>

      <TruckDialog
        open={truckDialogOpen}
        onOpenChange={setTruckDialogOpen}
        editingTruck={editingTruck}
        form={form}
        errors={errors}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleSubmit}
      />

      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        truck={assigningTruck}
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        onDriverChange={setSelectedDriverId}
        onSubmit={handleSubmitAssign}
      />

      <AlertDialog
        open={!!deleteTruckId}
        onOpenChange={(open) => !open && setDeleteTruckId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trucks.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trucks.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("trucks.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("trucks.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}