// drivers-section.tsx cu useAuditLog + Export PDF/Excel/CSV + Import CSV

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
import {
  Pencil, Plus, Trash2, Upload, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

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
import type { Employee } from "@/modules/hr/types";
import {
  addItem, generateId, getCollection, removeItem, updateItem,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { EntityTable, ExpiryCell } from "./transport-shared";
import { exportDriversPDF, exportDriversExcel, exportDriversCSV } from "./drivers-export-utils";
import { PHONE_RO_REGEX } from "./drivers-import-utils";
import { DriverImportDialog } from "./drivers-import-dialog";
import { type DriverFormData, type DriverFormErrors, EMPTY_FORM, DRIVER_STATUS_CLASS } from "./drivers-constants";
import { DriverDialog } from "./drivers-form-dialog";
import { DriverMobileCard } from "./drivers-mobile-card";

// ── DriversSection ─────────────────────────────────────────

export function DriversSection({ drivers, trucks, onDataChange }: {
  drivers: Driver[]; trucks: Truck[]; onDataChange: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const isMobile = useMobile(640);

  const [employees] = React.useState<Employee[]>(() => getCollection<Employee>(STORAGE_KEYS.employees));
  const [importOpen, setImportOpen] = React.useState(false);

  const statusFilterOptions = (["available", "on_trip", "off_duty"] as Driver["status"][]).map(
    (value) => ({ value, label: t(`drivers.status.${value}`) }),
  );

  const [dialogOpen, setDialogOpen] = useDialogState();
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [form, setForm] = React.useState<DriverFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<DriverFormErrors>({});
  const [deleteDriverId, setDeleteDriverId] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const getTruck = React.useCallback(
    (driver: Driver) => driver.truckId ? trucks.find((tr) => tr.id === driver.truckId) : undefined,
    [trucks],
  );

  const goToProfile = React.useCallback(
    (driverId: string) => navigate({ to: "/transport/drivers/$driverId", params: { driverId } }),
    [navigate],
  );

  function validateDriverForm(data: DriverFormData): DriverFormErrors {
    const errs: DriverFormErrors = {};
    if (!data.name || data.name.trim().length < 3) errs.name = t("drivers.validation.nameMin");
    if (!data.phone || !PHONE_RO_REGEX.test(data.phone.trim())) errs.phone = t("drivers.validation.phoneInvalid");
    if (!data.licenseExpiry) errs.licenseExpiry = t("drivers.validation.licenseExpiryRequired");
    return errs;
  }

  const handleOpenAdd = () => { setEditingDriver(null); setForm(EMPTY_FORM); setErrors({}); setDialogOpen(true); };

  const handleOpenEdit = React.useCallback((driver: Driver) => {
    setEditingDriver(driver);
    setForm({ name: driver.name, phone: driver.phone, licenseExpiry: driver.licenseExpiry, status: driver.status, truckId: driver.truckId ?? "", employeeId: driver.employeeId ?? "" });
    setErrors({}); setDialogOpen(true);
  }, [setDialogOpen]);

  const handleSubmit = () => {
    const errs = validateDriverForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const newTruckId = form.truckId || undefined;
    if (newTruckId) {
      updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.truckId === newTruckId && d.id !== (editingDriver?.id ?? ""), (d) => ({ ...d, truckId: undefined }));
    }
    const newEmployeeId = form.employeeId || undefined;
    if (editingDriver) {
      const old = { ...editingDriver };
      updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === editingDriver.id, (d) => ({ ...d, name: form.name.trim(), phone: form.phone.trim(), licenseExpiry: form.licenseExpiry, status: form.status, truckId: newTruckId, employeeId: newEmployeeId }));
      log({ action: "update", entity: "driver", entityId: editingDriver.id, entityLabel: form.name.trim(), detailKey: "activityLog.details.driverUpdated", oldValue: { name: old.name, phone: old.phone, status: old.status }, newValue: { name: form.name.trim(), phone: form.phone.trim(), status: form.status } });
      toast.success(t("drivers.toastUpdated"));
    } else {
      const newId = generateId();
      addItem<Driver>(STORAGE_KEYS.drivers, { id: newId, name: form.name.trim(), phone: form.phone.trim(), licenseExpiry: form.licenseExpiry, status: form.status, truckId: newTruckId, employeeId: newEmployeeId });
      log({ action: "create", entity: "driver", entityId: newId, entityLabel: form.name.trim(), detailKey: "activityLog.details.driverCreated", detailParams: { phone: form.phone.trim() } });
      toast.success(t("drivers.toastAdded"));
    }
    setDialogOpen(false); onDataChange();
  };

  const handleDelete = () => {
    if (!deleteDriverId) return;
    const driver = drivers.find((d) => d.id === deleteDriverId);
    removeItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === deleteDriverId);
    if (driver) log({ action: "delete", entity: "driver", entityId: deleteDriverId, entityLabel: driver.name, detailKey: "activityLog.details.driverDeleted", detailParams: { phone: driver.phone } });
    toast.success(t("drivers.toastDeleted"));
    setDeleteDriverId(null); onDataChange();
  };

  const columns: ColumnDef<Driver>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("drivers.columns.name")} />,
      cell: ({ row }) => {
        const truck = getTruck(row.original);
        return (
          <div className="font-medium">
            <button className="hover:underline text-left text-primary" onClick={() => goToProfile(row.original.id)}>{row.getValue("name")}</button>
            {truck && <div className="text-xs text-muted-foreground lg:hidden">{truck.plateNumber}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("drivers.columns.phone")} />,
      cell: ({ row }) => <div>{row.getValue("phone")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "licenseExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("drivers.columns.licenseExpiry")} />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("licenseExpiry")} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("drivers.columns.status")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Driver["status"];
        return <Badge variant="outline" className={`whitespace-nowrap ${DRIVER_STATUS_CLASS[status]}`}>{t(`drivers.status.${status}`)}</Badge>;
      },
      filterFn: (row, id, value) => { const s = value as string[] | undefined; return !s || s.length === 0 || s.includes(row.getValue(id)); },
    },
    {
      accessorKey: "truckId",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("drivers.columns.truck")} />,
      cell: ({ row }) => { const truck = getTruck(row.original); return <div className="text-sm text-muted-foreground">{truck ? truck.plateNumber : "—"}</div>; },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("drivers.columns.actions")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row.original)} aria-label={t("drivers.actions.edit")}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteDriverId(row.original.id)} aria-label={t("drivers.actions.delete")} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
      enableSorting: false, enableHiding: false,
    },
  ], [getTruck, goToProfile, handleOpenEdit, t]);

  const table = useReactTable({
    data: drivers, columns,
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
          <CardTitle>{t("drivers.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "icon" : "sm"} title={t("drivers.actions.export")}>
                  <Download className="h-3.5 w-3.5" />
                  {!isMobile && <span className="ml-1.5">{t("drivers.actions.export")}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportDriversPDF(drivers, trucks, t)}>{t("drivers.actions.exportPdf")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDriversExcel(drivers, trucks, t)}>{t("drivers.actions.exportExcel")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDriversCSV(drivers, trucks, t)}>{t("drivers.actions.exportCsv")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={() => setImportOpen(true)} title={t("drivers.import.button")}>
              <Upload className="h-3.5 w-3.5" />
              {!isMobile && <span className="ml-1.5">{t("drivers.import.button")}</span>}
            </Button>
            <Button onClick={handleOpenAdd} size="sm">
              <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
              {!isMobile && t("drivers.actions.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table} columns={columns}
            searchPlaceholder={t("drivers.placeholders.search")} searchKey="name"
            filterConfig={[{ columnId: "status", title: t("drivers.fields.status"), options: statusFilterOptions }]}
            columnVisibilityClass={{ phone: "hidden md:table-cell", truckId: "hidden lg:table-cell" }}
            emptyText={t("drivers.noResults")}
            renderMobileCard={(driver) => (
              <DriverMobileCard driver={driver} truck={getTruck(driver)}
                onEdit={() => handleOpenEdit(driver)} onDelete={() => setDeleteDriverId(driver.id)}
                onViewProfile={() => goToProfile(driver.id)} />
            )}
          />
        </CardContent>
      </Card>

      <DriverDialog open={dialogOpen} onOpenChange={setDialogOpen} editingDriver={editingDriver}
        form={form} errors={errors} trucks={trucks} employees={employees}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))} onSubmit={handleSubmit} />

      <DriverImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={onDataChange} isMobile={isMobile} />

      <AlertDialog open={!!deleteDriverId} onOpenChange={(open) => !open && setDeleteDriverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("drivers.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("drivers.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("drivers.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t("drivers.actions.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
