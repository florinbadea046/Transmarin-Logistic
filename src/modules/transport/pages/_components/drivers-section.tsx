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
  Pencil,
  Plus,
  Trash2,
  Upload,
  Download,
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import type { Driver, Truck } from "@/modules/transport/types";
import type { Employee } from "@/modules/hr/types";
import {
  addItem,
  generateId,
  getCollection,
  removeItem,
  updateItem,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { CardRow, EntityTable, ExpiryCell } from "./transport-shared";

// ── Helpers PDF ────────────────────────────────────────────

function stripD(s: unknown): string {
  return String(s ?? "")
    .replace(/[ăĂ]/g, (c) => (c === "a" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "a" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "i" ? "i" : "I"))
    .replace(/[șşŞ]/g, () => "s")
    .replace(/[ȘŠ]/g, () => "S")
    .replace(/[țţŢ]/g, () => "t")
    .replace(/[ȚŤ]/g, () => "T");
}

// ── Export Soferi ──────────────────────────────────────────

function exportDriversPDF(
  drivers: Driver[],
  trucks: Truck[],
  t: (k: string) => string,
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(stripD(t("drivers.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [
      [
        t("drivers.columns.name"),
        t("drivers.columns.phone"),
        t("drivers.columns.licenseExpiry"),
        t("drivers.columns.status"),
        t("drivers.columns.truck"),
      ].map(stripD),
    ],
    body: drivers.map((d) => {
      const truck = trucks.find((tr) => tr.id === d.truckId);
      return [
        d.name,
        d.phone,
        d.licenseExpiry,
        t(`drivers.status.${d.status}`),
        truck?.plateNumber ?? "—",
      ].map(stripD);
    }),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("drivers.export.filename")}.pdf`);
}

function exportDriversExcel(
  drivers: Driver[],
  trucks: Truck[],
  t: (k: string) => string,
) {
  const rows = drivers.map((d) => {
    const truck = trucks.find((tr) => tr.id === d.truckId);
    return {
      [t("drivers.columns.name")]: d.name,
      [t("drivers.columns.phone")]: d.phone,
      [t("drivers.columns.licenseExpiry")]: d.licenseExpiry,
      [t("drivers.columns.status")]: t(`drivers.status.${d.status}`),
      [t("drivers.columns.truck")]: truck?.plateNumber ?? "—",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soferi");
  XLSX.writeFile(wb, `${t("drivers.export.filename")}.xlsx`);
}

function exportDriversCSV(
  drivers: Driver[],
  trucks: Truck[],
  t: (k: string) => string,
) {
  const rows = drivers.map((d) => {
    const truck = trucks.find((tr) => tr.id === d.truckId);
    return {
      [t("drivers.columns.name")]: d.name,
      [t("drivers.columns.phone")]: d.phone,
      [t("drivers.columns.licenseExpiry")]: d.licenseExpiry,
      [t("drivers.columns.status")]: t(`drivers.status.${d.status}`),
      [t("drivers.columns.truck")]: truck?.plateNumber ?? "—",
    };
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("drivers.export.filename")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import Soferi ──────────────────────────────────────────

const PHONE_RO_REGEX = /^07[0-9]{8}$/;

const DRIVER_STATUS_CLASS: Record<Driver["status"], string> = {
  available:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  off_duty:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const DRIVER_COL_MAP: Record<string, string> = {
  nume: "name",
  name: "name",
  telefon: "phone",
  phone: "phone",
  "expirare permis": "licenseExpiry",
  licenseexpiry: "licenseExpiry",
  "license expiry": "licenseExpiry",
  "data expirare permis": "licenseExpiry",
  status: "status",
};

interface DriverParsedRow {
  mapped: Partial<Driver>;
  errors: string[];
  isDuplicate: boolean;
  rowIndex: number;
}

function parseDriverRows(
  raw: Record<string, string>[],
  existing: Driver[],
  t: (k: string) => string,
): DriverParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];
    const mapped: Partial<Driver> = {};

    for (const [col, val] of Object.entries(row)) {
      const key = DRIVER_COL_MAP[col.trim().toLowerCase()];
      if (key) (mapped as Record<string, unknown>)[key] = val.trim();
    }

    if (!mapped.name || mapped.name.trim().length < 3)
      errors.push(t("drivers.import.errorName"));
    if (!mapped.phone || !PHONE_RO_REGEX.test(mapped.phone.trim()))
      errors.push(t("drivers.import.errorPhone"));
    if (
      !mapped.licenseExpiry ||
      !/^\d{4}-\d{2}-\d{2}$/.test(mapped.licenseExpiry)
    )
      errors.push(t("drivers.import.errorDate"));

    const isDuplicate = existing.some(
      (e) =>
        e.name.toLowerCase() === (mapped.name ?? "").toLowerCase() ||
        e.phone === (mapped.phone ?? ""),
    );

    return { mapped, errors, isDuplicate, rowIndex: i + 1 };
  });
}

function DriverImportDialog({
  open,
  onOpenChange,
  onImported,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rows, setRows] = React.useState<DriverParsedRow[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [existing, setExisting] = React.useState<Driver[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setExisting(getCollection<Driver>(STORAGE_KEYS.drivers));
  }, [open]);

  const validRows = rows.filter((r) => r.errors.length === 0 && !r.isDuplicate);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const duplicateRows = rows.filter(
    (r) => r.errors.length === 0 && r.isDuplicate,
  );

  const handleFile = (file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) =>
        setRows(
          parseDriverRows(res.data as Record<string, string>[], existing, t),
        ),
    });
  };

  const handleConfirm = () => {
    let added = 0;
    for (const row of validRows) {
      addItem<Driver>(STORAGE_KEYS.drivers, {
        id: generateId(),
        name: row.mapped.name ?? "",
        phone: row.mapped.phone ?? "",
        licenseExpiry: row.mapped.licenseExpiry ?? "",
        status: (row.mapped.status as Driver["status"]) ?? "available",
        documents: [],
      } as Driver);
      added++;
    }
    const skipped = duplicateRows.length;
    if (added > 0 && skipped > 0)
      toast.success(t("drivers.import.toastPartial", { added, skipped }));
    else if (added > 0)
      toast.success(t("drivers.import.toastSuccess", { count: added }));
    else toast.info(t("drivers.import.toastAllSkipped"));
    onImported();
    onOpenChange(false);
    setRows([]);
    setFileName("");
  };

  const reset = () => {
    setRows([]);
    setFileName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent
        className={cn(
          "flex flex-col gap-4",
          isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-2xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>{t("drivers.import.title")}</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground"
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f?.name.endsWith(".csv")) handleFile(f);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-8 w-8 opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("drivers.import.dropzone")}
              </p>
              <p className="text-xs mt-1">{t("drivers.import.dropzoneHint")}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={reset}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div
              className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-1" : "grid-cols-3",
              )}
            >
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm">
                  {t("drivers.import.validCount", { count: validRows.length })}
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2",
                  invalidRows.length > 0
                    ? "border-red-200 bg-red-50 dark:bg-red-950"
                    : "border-muted bg-muted/30",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-4 w-4 shrink-0",
                    invalidRows.length > 0
                      ? "text-red-600"
                      : "text-muted-foreground",
                  )}
                />
                <span className="text-sm">
                  {t("drivers.import.invalidCount", {
                    count: invalidRows.length,
                  })}
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2",
                  duplicateRows.length > 0
                    ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950"
                    : "border-muted bg-muted/30",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-4 w-4 shrink-0",
                    duplicateRows.length > 0
                      ? "text-yellow-600"
                      : "text-muted-foreground",
                  )}
                />
                <span className="text-sm">
                  {t("drivers.import.duplicateCount", {
                    count: duplicateRows.length,
                  })}
                </span>
              </div>
            </div>

            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="min-w-[140px]">
                        {t("drivers.columns.name")}
                      </TableHead>
                      <TableHead className="min-w-[120px] hidden sm:table-cell">
                        {t("drivers.columns.phone")}
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        {t("drivers.import.errorsCol")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.rowIndex}
                        className={cn(
                          row.errors.length > 0
                            ? "bg-red-50 dark:bg-red-950/30"
                            : row.isDuplicate
                              ? "bg-yellow-50 dark:bg-yellow-950/30"
                              : "",
                        )}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {row.rowIndex}
                        </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {row.mapped.name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap">
                          {row.mapped.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {row.errors.length > 0 ? (
                            <span className="text-red-600">
                              {row.errors.join(", ")}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-yellow-600">
                              {t("drivers.import.duplicate")}
                            </span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className={cn(isMobile && "flex-col gap-2")}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(isMobile && "w-full")}
          >
            {t("drivers.cancel")}
          </Button>
          {rows.length > 0 && validRows.length > 0 && (
            <Button
              onClick={handleConfirm}
              className={cn(isMobile && "w-full")}
            >
              {t("drivers.import.confirm", { count: validRows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Types formular ─────────────────────────────────────────

interface DriverFormData {
  name: string;
  phone: string;
  licenseExpiry: string;
  status: Driver["status"];
  truckId: string;
  employeeId?: string;
}
interface DriverFormErrors {
  name?: string;
  phone?: string;
  licenseExpiry?: string;
}

const EMPTY_FORM: DriverFormData = {
  name: "",
  phone: "",
  licenseExpiry: "",
  status: "available",
  truckId: "",
  employeeId: "",
};

// ── Mobile Card ────────────────────────────────────────────

function DriverMobileCard({
  driver,
  truck,
  onEdit,
  onDelete,
  onViewProfile,
}: {
  driver: Driver;
  truck?: Truck;
  onEdit: () => void;
  onDelete: () => void;
  onViewProfile: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button
            className="font-semibold leading-tight hover:underline text-primary text-left"
            onClick={onViewProfile}
          >
            {driver.name}
          </button>
          <p className="text-xs text-muted-foreground">{driver.phone}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label={t("drivers.actions.edit")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label={t("drivers.actions.delete")}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label={t("drivers.card.status")}>
          <Badge
            variant="outline"
            className={DRIVER_STATUS_CLASS[driver.status]}
          >
            {t(`drivers.status.${driver.status}`)}
          </Badge>
        </CardRow>
        <CardRow label={t("drivers.card.licenseExpiry")}>
          <ExpiryCell dateStr={driver.licenseExpiry} />
        </CardRow>
        <CardRow label={t("drivers.card.truck")}>
          {truck ? (
            <span>{truck.plateNumber}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </CardRow>
      </div>
    </div>
  );
}

// ── Dialog CRUD ────────────────────────────────────────────

function DriverDialog({
  open,
  onOpenChange,
  editingDriver,
  form,
  errors,
  trucks,
  employees,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: Driver | null;
  form: DriverFormData;
  errors: DriverFormErrors;
  trucks: Truck[];
  employees: Employee[];
  onFormChange: (patch: Partial<DriverFormData>) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingDriver ? t("drivers.edit") : t("drivers.add")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="name">{t("drivers.fields.name")}</Label>
            <Input
              id="name"
              placeholder={t("drivers.placeholders.name")}
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t("drivers.fields.phone")}</Label>
            <Input
              id="phone"
              placeholder={t("drivers.placeholders.phone")}
              value={form.phone}
              onChange={(e) => onFormChange({ phone: e.target.value })}
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="licenseExpiry">
              {t("drivers.fields.licenseExpiry")}
            </Label>
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
            <Label htmlFor="status">{t("drivers.fields.status")}</Label>
            <Select
              value={form.status}
              onValueChange={(val) =>
                onFormChange({ status: val as Driver["status"] })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  {t("drivers.status.available")}
                </SelectItem>
                <SelectItem value="on_trip">
                  {t("drivers.status.on_trip")}
                </SelectItem>
                <SelectItem value="off_duty">
                  {t("drivers.status.off_duty")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="employee">
              {t("drivers.fields.employee", { defaultValue: "Angajat HR" })}
            </Label>
            <Select
              value={form.employeeId || "none"}
              onValueChange={(val) =>
                onFormChange({ employeeId: val === "none" ? "" : val })
              }
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Fara legatura HR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Fara legatura HR</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="truck">{t("drivers.fields.truck")}</Label>
            <Select
              value={form.truckId || "none"}
              onValueChange={(val) =>
                onFormChange({ truckId: val === "none" ? "" : val })
              }
            >
              <SelectTrigger id="truck">
                <SelectValue placeholder={t("drivers.placeholders.noTruck")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("drivers.placeholders.noTruck")}
                </SelectItem>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("drivers.cancel")}
          </Button>
          <Button onClick={onSubmit}>
            {editingDriver ? t("drivers.save") : t("drivers.actions.add")}
          </Button>
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const isMobile = useMobile(640);

  const [employees] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [importOpen, setImportOpen] = React.useState(false);

  const statusFilterOptions = (
    ["available", "on_trip", "off_duty"] as Driver["status"][]
  ).map((value) => ({ value, label: t(`drivers.status.${value}`) }));

  const [dialogOpen, setDialogOpen] = useDialogState();
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [form, setForm] = React.useState<DriverFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<DriverFormErrors>({});
  const [deleteDriverId, setDeleteDriverId] = React.useState<string | null>(
    null,
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const getTruck = React.useCallback(
    (driver: Driver) =>
      driver.truckId
        ? trucks.find((tr) => tr.id === driver.truckId)
        : undefined,
    [trucks],
  );

  const goToProfile = React.useCallback(
    (driverId: string) =>
      navigate({ to: "/transport/drivers/$driverId", params: { driverId } }),
    [navigate],
  );

  function validateDriverForm(data: DriverFormData): DriverFormErrors {
    const errs: DriverFormErrors = {};
    if (!data.name || data.name.trim().length < 3)
      errs.name = t("drivers.validation.nameMin");
    if (!data.phone || !PHONE_RO_REGEX.test(data.phone.trim()))
      errs.phone = t("drivers.validation.phoneInvalid");
    if (!data.licenseExpiry)
      errs.licenseExpiry = t("drivers.validation.licenseExpiryRequired");
    return errs;
  }

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = React.useCallback(
    (driver: Driver) => {
      setEditingDriver(driver);
      setForm({
        name: driver.name,
        phone: driver.phone,
        licenseExpiry: driver.licenseExpiry,
        status: driver.status,
        truckId: driver.truckId ?? "",
        employeeId: driver.employeeId ?? "",
      });
      setErrors({});
      setDialogOpen(true);
    },
    [setDialogOpen],
  );

  const handleSubmit = () => {
    const errs = validateDriverForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const newTruckId = form.truckId || undefined;
    if (newTruckId) {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.truckId === newTruckId && d.id !== (editingDriver?.id ?? ""),
        (d) => ({ ...d, truckId: undefined }),
      );
    }
    const newEmployeeId = form.employeeId || undefined;
    if (editingDriver) {
      const old = { ...editingDriver };
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
          employeeId: newEmployeeId,
        }),
      );
      log({
        action: "update",
        entity: "driver",
        entityId: editingDriver.id,
        entityLabel: form.name.trim(),
        detailKey: "activityLog.details.driverUpdated",
        oldValue: { name: old.name, phone: old.phone, status: old.status },
        newValue: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          status: form.status,
        },
      });
      toast.success(t("drivers.toastUpdated"));
    } else {
      const newId = generateId();
      addItem<Driver>(STORAGE_KEYS.drivers, {
        id: newId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        licenseExpiry: form.licenseExpiry,
        status: form.status,
        truckId: newTruckId,
        employeeId: newEmployeeId,
      });
      log({
        action: "create",
        entity: "driver",
        entityId: newId,
        entityLabel: form.name.trim(),
        detailKey: "activityLog.details.driverCreated",
        detailParams: { phone: form.phone.trim() },
      });
      toast.success(t("drivers.toastAdded"));
    }
    setDialogOpen(false);
    onDataChange();
  };

  const handleDelete = () => {
    if (!deleteDriverId) return;
    const driver = drivers.find((d) => d.id === deleteDriverId);
    removeItem<Driver>(STORAGE_KEYS.drivers, (d) => d.id === deleteDriverId);
    if (driver)
      log({
        action: "delete",
        entity: "driver",
        entityId: deleteDriverId,
        entityLabel: driver.name,
        detailKey: "activityLog.details.driverDeleted",
        detailParams: { phone: driver.phone },
      });
    toast.success(t("drivers.toastDeleted"));
    setDeleteDriverId(null);
    onDataChange();
  };

  const columns: ColumnDef<Driver>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("drivers.columns.name")}
          />
        ),
        cell: ({ row }) => {
          const truck = getTruck(row.original);
          return (
            <div className="font-medium">
              <button
                className="hover:underline text-left text-primary"
                onClick={() => goToProfile(row.original.id)}
              >
                {row.getValue("name")}
              </button>
              {truck && (
                <div className="text-xs text-muted-foreground lg:hidden">
                  {truck.plateNumber}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("drivers.columns.phone")}
          />
        ),
        cell: ({ row }) => <div>{row.getValue("phone")}</div>,
        enableSorting: false,
      },
      {
        accessorKey: "licenseExpiry",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("drivers.columns.licenseExpiry")}
          />
        ),
        cell: ({ row }) => (
          <ExpiryCell dateStr={row.getValue("licenseExpiry")} />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("drivers.columns.status")}
          />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as Driver["status"];
          return (
            <Badge
              variant="outline"
              className={`whitespace-nowrap ${DRIVER_STATUS_CLASS[status]}`}
            >
              {t(`drivers.status.${status}`)}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          const s = value as string[] | undefined;
          return !s || s.length === 0 || s.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "truckId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("drivers.columns.truck")}
          />
        ),
        cell: ({ row }) => {
          const truck = getTruck(row.original);
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
        header: () => (
          <div className="text-right">{t("drivers.columns.actions")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(row.original)}
              aria-label={t("drivers.actions.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDriverId(row.original.id)}
              aria-label={t("drivers.actions.delete")}
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
    [getTruck, goToProfile, handleOpenEdit, t],
  );

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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("drivers.title")}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  title={t("drivers.actions.export")}
                >
                  <Download className="h-3.5 w-3.5" />
                  {!isMobile && (
                    <span className="ml-1.5">
                      {t("drivers.actions.export")}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => exportDriversPDF(drivers, trucks, t)}
                >
                  {t("drivers.actions.exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportDriversExcel(drivers, trucks, t)}
                >
                  {t("drivers.actions.exportExcel")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportDriversCSV(drivers, trucks, t)}
                >
                  {t("drivers.actions.exportCsv")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Import */}
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={() => setImportOpen(true)}
              title={t("drivers.import.button")}
            >
              <Upload className="h-3.5 w-3.5" />
              {!isMobile && (
                <span className="ml-1.5">{t("drivers.import.button")}</span>
              )}
            </Button>
            {/* Add */}
            <Button onClick={handleOpenAdd} size="sm">
              <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
              {!isMobile && t("drivers.actions.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table}
            columns={columns}
            searchPlaceholder={t("drivers.placeholders.search")}
            searchKey="name"
            filterConfig={[
              {
                columnId: "status",
                title: t("drivers.fields.status"),
                options: statusFilterOptions,
              },
            ]}
            columnVisibilityClass={{
              phone: "hidden md:table-cell",
              truckId: "hidden lg:table-cell",
            }}
            emptyText={t("drivers.noResults")}
            renderMobileCard={(driver) => (
              <DriverMobileCard
                driver={driver}
                truck={getTruck(driver)}
                onEdit={() => handleOpenEdit(driver)}
                onDelete={() => setDeleteDriverId(driver.id)}
                onViewProfile={() => goToProfile(driver.id)}
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
        employees={employees}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleSubmit}
      />

      <DriverImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={onDataChange}
        isMobile={isMobile}
      />

      <AlertDialog
        open={!!deleteDriverId}
        onOpenChange={(open) => !open && setDeleteDriverId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("drivers.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("drivers.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("drivers.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("drivers.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
