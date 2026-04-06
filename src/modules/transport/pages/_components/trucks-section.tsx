// trucks-section.tsx cu Export PDF/Excel/CSV + Import CSV

import * as React from "react";
import {
  type ColumnDef, getCoreRowModel, getFilteredRowModel,
  getFacetedRowModel, getFacetedUniqueValues, getPaginationRowModel,
  getSortedRowModel, type SortingState, type ColumnFiltersState,
  type VisibilityState, useReactTable,
} from "@tanstack/react-table";
import { Link, Pencil, Plus, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import type { Driver, Truck } from "@/modules/transport/types";
import { addItem, generateId, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { EntityTable, ExpiryCell } from "./transport-shared";
import { exportTrucksPDF, exportTrucksExcel, exportTrucksCSV } from "./trucks-export-utils";
import { TruckImportDialog } from "./trucks-import-dialog";
import { PLATE_REGEX } from "./trucks-import-utils";
import { TruckDialog } from "./trucks-form-dialog";
import { EMPTY_FORM, type TruckFormData, type TruckFormErrors } from "./trucks-form-types";
import { AssignDialog } from "./trucks-assign-dialog";
import { TruckMobileCard } from "./trucks-mobile-card";
import { STATUS_CLASS } from "./trucks-constants";

// ── TrucksSection ──────────────────────────────────────────

export function TrucksSection({ drivers, trucks, onDataChange }: {
  drivers: Driver[]; trucks: Truck[]; onDataChange: () => void;
}) {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const isMobile = useMobile(640);

  const statusFilterOptions = (["available", "on_trip", "in_service"] as Truck["status"][]).map(
    (value) => ({ value, label: t(`trucks.status.${value}`) }),
  );

  const [truckDialogOpen, setTruckDialogOpen] = useDialogState();
  const [editingTruck, setEditingTruck] = React.useState<Truck | null>(null);
  const [form, setForm] = React.useState<TruckFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<TruckFormErrors>({});
  const [deleteTruckId, setDeleteTruckId] = React.useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useDialogState();
  const [assigningTruck, setAssigningTruck] = React.useState<Truck | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>("");
  const [importOpen, setImportOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const getDriver = React.useCallback(
    (truck: Truck) => drivers.find((d) => d.truckId === truck.id),
    [drivers],
  );

  function validateTruckForm(data: TruckFormData): TruckFormErrors {
    const errs: TruckFormErrors = {};
    if (!data.plateNumber || !PLATE_REGEX.test(data.plateNumber.trim().toUpperCase())) errs.plateNumber = t("trucks.validation.plateNumberInvalid");
    if (!data.brand || data.brand.trim().length < 2) errs.brand = t("trucks.validation.brandMin");
    if (!data.model || data.model.trim().length < 1) errs.model = t("trucks.validation.modelRequired");
    const year = Number(data.year); const maxYear = new Date().getFullYear();
    if (!data.year || isNaN(year) || year < 1990 || year > maxYear) errs.year = t("trucks.validation.yearRange", { max: maxYear });
    const mileage = Number(data.mileage);
    if (!data.mileage || isNaN(mileage) || mileage < 0) errs.mileage = t("trucks.validation.mileagePositive");
    if (!data.itpExpiry) errs.itpExpiry = t("trucks.validation.itpExpiryRequired");
    if (!data.rcaExpiry) errs.rcaExpiry = t("trucks.validation.rcaExpiryRequired");
    if (!data.vignetteExpiry) errs.vignetteExpiry = t("trucks.validation.vignetteExpiryRequired");
    return errs;
  }

  const handleOpenAdd = () => { setEditingTruck(null); setForm(EMPTY_FORM); setErrors({}); setTruckDialogOpen(true); };
  const handleOpenEdit = React.useCallback((truck: Truck) => {
    setEditingTruck(truck);
    setForm({ plateNumber: truck.plateNumber, brand: truck.brand, model: truck.model, year: String(truck.year), mileage: String(truck.mileage), status: truck.status, itpExpiry: truck.itpExpiry, rcaExpiry: truck.rcaExpiry, vignetteExpiry: truck.vignetteExpiry });
    setErrors({}); setTruckDialogOpen(true);
  }, [setTruckDialogOpen]);

  const handleSubmit = () => {
    const errs = validateTruckForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (editingTruck) {
      const old = { ...editingTruck };
      updateItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === editingTruck.id, (tr) => ({ ...tr, plateNumber: form.plateNumber.trim().toUpperCase(), brand: form.brand.trim(), model: form.model.trim(), year: Number(form.year), mileage: Number(form.mileage), status: form.status, itpExpiry: form.itpExpiry, rcaExpiry: form.rcaExpiry, vignetteExpiry: form.vignetteExpiry }));
      log({ action: "update", entity: "truck", entityId: editingTruck.id, entityLabel: form.plateNumber.trim().toUpperCase(), detailKey: "activityLog.details.truckUpdated", oldValue: { plateNumber: old.plateNumber, status: old.status }, newValue: { plateNumber: form.plateNumber.trim().toUpperCase(), status: form.status } });
      toast.success(t("trucks.toastUpdated"));
    } else {
      const newId = generateId();
      addItem<Truck>(STORAGE_KEYS.trucks, { id: newId, plateNumber: form.plateNumber.trim().toUpperCase(), brand: form.brand.trim(), model: form.model.trim(), year: Number(form.year), mileage: Number(form.mileage), status: form.status, itpExpiry: form.itpExpiry, rcaExpiry: form.rcaExpiry, vignetteExpiry: form.vignetteExpiry });
      log({ action: "create", entity: "truck", entityId: newId, entityLabel: form.plateNumber.trim().toUpperCase(), detailKey: "activityLog.details.truckCreated", detailParams: { plate: form.plateNumber.trim().toUpperCase() } });
      toast.success(t("trucks.toastAdded"));
    }
    setTruckDialogOpen(false); onDataChange();
  };

  const handleDelete = () => {
    if (!deleteTruckId) return;
    const truck = trucks.find((tr) => tr.id === deleteTruckId);
    updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.truckId === deleteTruckId, (d) => ({ ...d, truckId: undefined }));
    removeItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === deleteTruckId);
    if (truck) log({ action: "delete", entity: "truck", entityId: deleteTruckId, entityLabel: truck.plateNumber, detailKey: "activityLog.details.truckDeleted" });
    toast.success(t("trucks.toastDeleted"));
    setDeleteTruckId(null); onDataChange();
  };

  const handleOpenAssign = React.useCallback((truck: Truck) => {
    setAssigningTruck(truck);
    setSelectedDriverId(drivers.find((d) => d.truckId === truck.id)?.id ?? "");
    setAssignDialogOpen(true);
  }, [drivers, setAssignDialogOpen]);

  const handleSubmitAssign = () => {
    if (!assigningTruck) return;
    updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.truckId === assigningTruck.id, (d) => ({ ...d, truckId: undefined }));
    if (selectedDriverId && selectedDriverId !== "none") {
      updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === selectedDriverId, (d) => ({ ...d, truckId: assigningTruck.id }));
      toast.success(t("trucks.toastAssigned"));
    } else {
      toast.success(t("trucks.toastUnassigned"));
    }
    setAssignDialogOpen(false); onDataChange();
  };

  const columns: ColumnDef<Truck>[] = React.useMemo(() => [
    {
      accessorKey: "plateNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.plateNumber")} />,
      cell: ({ row }) => {
        const driver = getDriver(row.original);
        return (
          <div className="font-medium">
            <div>{row.getValue("plateNumber")}</div>
            <div className="text-xs text-muted-foreground">{row.original.brand} {row.original.model} ({row.original.year})</div>
            {driver && <div className="text-xs text-muted-foreground lg:hidden">{driver.name}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("trucks.columns.status")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Truck["status"];
        return <Badge variant="outline" className={`whitespace-nowrap ${STATUS_CLASS[status]}`}>{t(`trucks.status.${status}`)}</Badge>;
      },
      filterFn: (row, id, value) => { const s = value as string[] | undefined; return !s || s.length === 0 || s.includes(row.getValue(id)); },
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
      cell: ({ row }) => { const d = getDriver(row.original); return <div className="text-sm text-muted-foreground">{d ? d.name : "—"}</div>; },
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
            <Button variant="ghost" size="icon" onClick={() => handleOpenAssign(truck)} aria-label={t("trucks.actions.assign")}><Link className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(truck)} aria-label={t("trucks.actions.edit")}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTruckId(truck.id)} aria-label={t("trucks.actions.delete")} className="text-red-500 hover:text-red-600" disabled={isOnTrip} title={isOnTrip ? t("trucks.deleteDisabledTooltip") : undefined}><Trash2 className="h-4 w-4" /></Button>
          </div>
        );
      },
      enableSorting: false, enableHiding: false,
    },
  ], [getDriver, handleOpenAssign, handleOpenEdit, t]);

  const table = useReactTable({
    data: trucks, columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("trucks.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "icon" : "sm"} title={t("trucks.actions.export")}>
                  <Download className="h-3.5 w-3.5" />
                  {!isMobile && <span className="ml-1.5">{t("trucks.actions.export")}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportTrucksPDF(trucks, drivers, t)}>{t("trucks.actions.exportPdf")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTrucksExcel(trucks, drivers, t)}>{t("trucks.actions.exportExcel")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportTrucksCSV(trucks, drivers, t)}>{t("trucks.actions.exportCsv")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={() => setImportOpen(true)} title={t("trucks.import.button")}>
              <Upload className="h-3.5 w-3.5" />
              {!isMobile && <span className="ml-1.5">{t("trucks.import.button")}</span>}
            </Button>
            <Button onClick={handleOpenAdd} size="sm">
              <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
              {!isMobile && t("trucks.actions.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table} columns={columns}
            searchPlaceholder={t("trucks.placeholders.search")} searchKey="plateNumber"
            filterConfig={[{ columnId: "status", title: t("trucks.fields.status"), options: statusFilterOptions }]}
            columnVisibilityClass={{ rcaExpiry: "hidden md:table-cell", vignetteExpiry: "hidden md:table-cell", driverName: "hidden lg:table-cell" }}
            emptyText={t("trucks.noResults")}
            renderMobileCard={(truck) => (
              <TruckMobileCard truck={truck} driver={getDriver(truck)}
                onEdit={() => handleOpenEdit(truck)} onDelete={() => setDeleteTruckId(truck.id)}
                onAssign={() => handleOpenAssign(truck)} />
            )}
          />
        </CardContent>
      </Card>

      <TruckDialog open={truckDialogOpen} onOpenChange={setTruckDialogOpen} editingTruck={editingTruck}
        form={form} errors={errors} onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))} onSubmit={handleSubmit} />

      <AssignDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} truck={assigningTruck}
        drivers={drivers} selectedDriverId={selectedDriverId} onDriverChange={setSelectedDriverId} onSubmit={handleSubmitAssign} />

      <TruckImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={onDataChange} isMobile={isMobile} />

      <AlertDialog open={!!deleteTruckId} onOpenChange={(open) => !open && setDeleteTruckId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trucks.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trucks.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("trucks.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t("trucks.actions.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
