// trucks-section.tsx cu Export PDF/Excel/CSV + Import CSV

import * as React from "react";
import {
  type ColumnDef, getCoreRowModel, getFilteredRowModel,
  getFacetedRowModel, getFacetedUniqueValues, getPaginationRowModel,
  getSortedRowModel, type SortingState, type ColumnFiltersState,
  type VisibilityState, useReactTable,
} from "@tanstack/react-table";
import { Link, Pencil, Plus, Trash2, Upload, Download, X, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import type { Driver, Truck } from "@/modules/transport/types";
import { addItem, generateId, getCollection, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { CardRow, EntityTable, ExpiryCell } from "./transport-shared";

// ── Helpers ────────────────────────────────────────────────

const PLATE_REGEX = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;

function stripD(s: unknown): string {
  return String(s ?? "")
    .replace(/[ăĂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "i" ? "i" : "I")
    .replace(/[șşŞ]/g, () => "s").replace(/[ȘŠ]/g, () => "S")
    .replace(/[țţŢ]/g, () => "t").replace(/[ȚŤ]/g, () => "T");
}

// ── Export Camioane ────────────────────────────────────────

function exportTrucksPDF(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(stripD(t("trucks.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [[
      t("trucks.columns.plateNumber"), t("trucks.fields.brand"), t("trucks.fields.model"),
      t("trucks.fields.year"), t("trucks.columns.status"),
      t("trucks.columns.itpExpiry"), t("trucks.columns.rcaExpiry"), t("trucks.columns.vignetteExpiry"),
      t("trucks.columns.driver"),
    ].map(stripD)],
    body: trucks.map((tr) => {
      const driver = drivers.find((d) => d.truckId === tr.id);
      return [
        tr.plateNumber, tr.brand, tr.model, String(tr.year),
        t(`trucks.status.${tr.status}`),
        tr.itpExpiry, tr.rcaExpiry, tr.vignetteExpiry,
        driver?.name ?? "—",
      ].map(stripD);
    }),
    startY: 22, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("trucks.export.filename")}.pdf`);
}

function exportTrucksExcel(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const rows = trucks.map((tr) => {
    const driver = drivers.find((d) => d.truckId === tr.id);
    return {
      [t("trucks.columns.plateNumber")]: tr.plateNumber,
      [t("trucks.fields.brand")]: tr.brand,
      [t("trucks.fields.model")]: tr.model,
      [t("trucks.fields.year")]: tr.year,
      [t("trucks.columns.status")]: t(`trucks.status.${tr.status}`),
      [t("trucks.columns.itpExpiry")]: tr.itpExpiry,
      [t("trucks.columns.rcaExpiry")]: tr.rcaExpiry,
      [t("trucks.columns.vignetteExpiry")]: tr.vignetteExpiry,
      [t("trucks.columns.driver")]: driver?.name ?? "—",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Camioane");
  XLSX.writeFile(wb, `${t("trucks.export.filename")}.xlsx`);
}

function exportTrucksCSV(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const rows = trucks.map((tr) => {
    const driver = drivers.find((d) => d.truckId === tr.id);
    return {
      [t("trucks.columns.plateNumber")]: tr.plateNumber,
      [t("trucks.fields.brand")]: tr.brand,
      [t("trucks.fields.model")]: tr.model,
      [t("trucks.fields.year")]: tr.year,
      [t("trucks.columns.status")]: t(`trucks.status.${tr.status}`),
      [t("trucks.columns.itpExpiry")]: tr.itpExpiry,
      [t("trucks.columns.rcaExpiry")]: tr.rcaExpiry,
      [t("trucks.columns.vignetteExpiry")]: tr.vignetteExpiry,
      [t("trucks.columns.driver")]: driver?.name ?? "—",
    };
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${t("trucks.export.filename")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Import Camioane ────────────────────────────────────────

const TRUCK_COL_MAP: Record<string, string> = {
  // Numar inmatriculare
  "numar inmatriculare": "plateNumber", "platenumber": "plateNumber",
  "plate": "plateNumber", "numar": "plateNumber",
  "truck": "plateNumber", "camion": "plateNumber",
  "nr. inmatriculare": "plateNumber",
  // Marca
  "marca": "brand", "brand": "brand",
  // Model
  "model": "model",
  // An
  "an": "year", "an fabricatie": "year", "year": "year",
  // Kilometraj
  "kilometraj": "mileage", "mileage": "mileage", "km": "mileage",
  // ITP
  "itp": "itpExpiry", "expirare itp": "itpExpiry",
  "itpexpiry": "itpExpiry", "itp expiry": "itpExpiry",
  // RCA
  "rca": "rcaExpiry", "expirare rca": "rcaExpiry",
  "rcaexpiry": "rcaExpiry", "rca expiry": "rcaExpiry",
  // Vigneta
  "vigneta": "vignetteExpiry", "vignette": "vignetteExpiry",
  "expirare vigneta": "vignetteExpiry", "vignetteexpiry": "vignetteExpiry",
  "vignette expiry": "vignetteExpiry",
};

const TRUCK_STATUS_MAP: Record<string, Truck["status"]> = {
  "disponibil": "available", "available": "available",
  "in cursa": "on_trip", "on trip": "on_trip", "on_trip": "on_trip",
  "in service": "in_service", "in_service": "in_service",
};

interface TruckParsedRow {
  mapped: Partial<Truck>;
  errors: string[];
  isDuplicate: boolean;
  rowIndex: number;
}

function parseTruckRows(
  raw: Record<string, string>[],
  existing: Truck[],
  t: (k: string) => string,
): TruckParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];
    const mapped: Partial<Truck> = {};

    for (const [col, val] of Object.entries(row)) {
      const key = TRUCK_COL_MAP[col.trim().toLowerCase()];
      if (key) (mapped as Record<string, unknown>)[key] = val.trim();
    }

    const plate = (mapped.plateNumber ?? "").toUpperCase();
    if (!plate || !PLATE_REGEX.test(plate)) errors.push(t("trucks.import.errorPlate"));
    else mapped.plateNumber = plate;

    if (!mapped.brand || String(mapped.brand).trim().length < 2) errors.push(t("trucks.import.errorBrand"));
    if (!mapped.model) errors.push(t("trucks.import.errorModel"));

    const year = Number(mapped.year);
    if (!mapped.year || isNaN(year) || year < 1990 || year > new Date().getFullYear())
      errors.push(t("trucks.import.errorYear"));
    else (mapped as Record<string, unknown>).year = year;

    const mileage = Number(mapped.mileage);
    if (mapped.mileage !== undefined && (isNaN(mileage) || mileage < 0))
      errors.push(t("trucks.import.errorMileage"));
    else if (mapped.mileage !== undefined) (mapped as Record<string, unknown>).mileage = mileage;

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!mapped.itpExpiry || !dateRe.test(mapped.itpExpiry)) errors.push(t("trucks.import.errorItp"));
    if (!mapped.rcaExpiry || !dateRe.test(mapped.rcaExpiry)) errors.push(t("trucks.import.errorRca"));
    if (!mapped.vignetteExpiry || !dateRe.test(mapped.vignetteExpiry)) errors.push(t("trucks.import.errorVignette"));

    // Mapeaza status
    if ((mapped as Record<string, unknown>).status) {
      const rawStatus = String((mapped as Record<string, unknown>).status).trim().toLowerCase();
      (mapped as Record<string, unknown>).status = TRUCK_STATUS_MAP[rawStatus] ?? "available";
    }

    const isDuplicate = existing.some(
      (e) => e.plateNumber.toLowerCase() === plate.toLowerCase(),
    );

    return { mapped, errors, isDuplicate, rowIndex: i + 1 };
  });
}

function TruckImportDialog({
  open, onOpenChange, onImported, isMobile,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void; isMobile: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rows, setRows] = React.useState<TruckParsedRow[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [existing, setExisting] = React.useState<Truck[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setExisting(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, [open]);

  const validRows = rows.filter((r) => r.errors.length === 0 && !r.isDuplicate);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const duplicateRows = rows.filter((r) => r.errors.length === 0 && r.isDuplicate);

  const handleFile = (file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => setRows(parseTruckRows(res.data as Record<string, string>[], existing, t)),
    });
  };

  const handleConfirm = () => {
    let added = 0;
    for (const row of validRows) {
      addItem<Truck>(STORAGE_KEYS.trucks, {
        id: generateId(),
        plateNumber: row.mapped.plateNumber ?? "",
        brand: String(row.mapped.brand ?? ""),
        model: String(row.mapped.model ?? ""),
        year: ((row.mapped as Record<string, unknown>).year as number) ?? 0,
        mileage: ((row.mapped as Record<string, unknown>).mileage as number) ?? 0,
        status: "available",
        itpExpiry: row.mapped.itpExpiry ?? "",
        rcaExpiry: row.mapped.rcaExpiry ?? "",
        vignetteExpiry: row.mapped.vignetteExpiry ?? "",
      });
      added++;
    }
    const skipped = duplicateRows.length;
    if (added > 0 && skipped > 0) toast.success(t("trucks.import.toastPartial", { added, skipped }));
    else if (added > 0) toast.success(t("trucks.import.toastSuccess", { count: added }));
    else toast.info(t("trucks.import.toastAllSkipped"));
    onImported(); onOpenChange(false); setRows([]); setFileName("");
  };

  const reset = () => { setRows([]); setFileName(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className={cn("flex flex-col gap-4", isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{t("trucks.import.title")}</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.name.endsWith(".csv")) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-8 w-8 text-muted-foreground/60" />
            <div>
              <p className="text-sm font-medium">{t("trucks.import.dropzone")}</p>
              <p className="text-xs mt-1 text-muted-foreground">{t("trucks.import.dropzoneHint")}</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-3")}>
              <div className="flex items-center gap-2 rounded-lg border-2 border-green-500 bg-green-500/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {t("trucks.import.validCount", { count: validRows.length })}
                </span>
              </div>
              <div className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2",
                invalidRows.length > 0 ? "border-red-500 bg-red-500/10" : "border-muted bg-muted/20")}>
                <AlertTriangle className={cn("h-4 w-4 shrink-0",
                  invalidRows.length > 0 ? "text-red-500" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium",
                  invalidRows.length > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
                  {t("trucks.import.invalidCount", { count: invalidRows.length })}
                </span>
              </div>
              <div className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2",
                duplicateRows.length > 0 ? "border-yellow-500 bg-yellow-500/10" : "border-muted bg-muted/20")}>
                <AlertTriangle className={cn("h-4 w-4 shrink-0",
                  duplicateRows.length > 0 ? "text-yellow-500" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium",
                  duplicateRows.length > 0 ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground")}>
                  {t("trucks.import.duplicateCount", { count: duplicateRows.length })}
                </span>
              </div>
            </div>

            <ScrollArea className="h-[220px] rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-foreground font-semibold">#</TableHead>
                      <TableHead className="min-w-[120px] text-foreground font-semibold">{t("trucks.columns.plateNumber")}</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell text-foreground font-semibold">{t("trucks.fields.brand")}</TableHead>
                      <TableHead className="min-w-[200px] text-foreground font-semibold">{t("trucks.import.errorsCol")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.rowIndex} className={cn(
                        row.errors.length > 0
                          ? "bg-red-500/10 hover:bg-red-500/15"
                          : row.isDuplicate
                          ? "bg-yellow-500/10 hover:bg-yellow-500/15"
                          : "bg-green-500/5 hover:bg-green-500/10",
                      )}>
                        <TableCell className="text-xs text-muted-foreground font-medium">{row.rowIndex}</TableCell>
                        <TableCell className="text-sm font-semibold whitespace-nowrap">{row.mapped.plateNumber ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap text-muted-foreground">{String(row.mapped.brand ?? "—")}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap font-medium">
                          {row.errors.length > 0 ? (
                            <span className="text-red-600 dark:text-red-400">{row.errors.join(" | ")}</span>
                          ) : row.isDuplicate ? (
                            <span className="text-yellow-600 dark:text-yellow-400">{t("trucks.import.duplicate")}</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">✓ {t("trucks.import.rowValid")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-green-500/20 border border-green-500" />
                {t("trucks.import.legendValid")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-red-500/20 border border-red-500" />
                {t("trucks.import.legendInvalid")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500" />
                {t("trucks.import.legendDuplicate")}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className={cn("gap-2", isMobile && "flex-col")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("trucks.cancel")}
          </Button>
          {rows.length > 0 && (
            <Button onClick={handleConfirm} disabled={validRows.length === 0} className={cn(isMobile && "w-full")}>
              {validRows.length > 0
                ? t("trucks.import.confirm", { count: validRows.length })
                : t("trucks.import.noValidRows")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tipuri formular ────────────────────────────────────────

interface TruckFormData {
  plateNumber: string; brand: string; model: string; year: string; mileage: string;
  status: Truck["status"]; itpExpiry: string; rcaExpiry: string; vignetteExpiry: string;
}
interface TruckFormErrors {
  plateNumber?: string; brand?: string; model?: string; year?: string; mileage?: string;
  itpExpiry?: string; rcaExpiry?: string; vignetteExpiry?: string;
}
const EMPTY_FORM: TruckFormData = {
  plateNumber: "", brand: "", model: "", year: "", mileage: "",
  status: "available", itpExpiry: "", rcaExpiry: "", vignetteExpiry: "",
};

// ── Mobile Card ────────────────────────────────────────────

function TruckMobileCard({ truck, driver, onEdit, onDelete, onAssign }: {
  truck: Truck; driver?: Driver; onEdit: () => void; onDelete: () => void; onAssign: () => void;
}) {
  const { t } = useTranslation();
  const STATUS_CLASS: Record<Truck["status"], string> = {
    available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  };
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{truck.plateNumber}</p>
          <p className="text-xs text-muted-foreground">{truck.brand} {truck.model} ({truck.year})</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onAssign} aria-label={t("trucks.actions.assign")}><Link className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("trucks.actions.edit")}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("trucks.actions.delete")} className="text-red-500 hover:text-red-600" disabled={truck.status === "on_trip"}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label={t("trucks.card.status")}>
          <Badge variant="outline" className={STATUS_CLASS[truck.status]}>{t(`trucks.status.${truck.status}`)}</Badge>
        </CardRow>
        <CardRow label={t("trucks.card.driver")}>{driver ? <span>{driver.name}</span> : <span className="text-muted-foreground">—</span>}</CardRow>
        <CardRow label={t("trucks.card.mileage")}><span>{truck.mileage.toLocaleString("ro-RO")}</span></CardRow>
        <CardRow label={t("trucks.card.itp")}><ExpiryCell dateStr={truck.itpExpiry} /></CardRow>
        <CardRow label={t("trucks.card.rca")}><ExpiryCell dateStr={truck.rcaExpiry} /></CardRow>
        <CardRow label={t("trucks.card.vignette")}><ExpiryCell dateStr={truck.vignetteExpiry} /></CardRow>
      </div>
    </div>
  );
}

// ── Dialog CRUD ────────────────────────────────────────────

function TruckDialog({ open, onOpenChange, editingTruck, form, errors, onFormChange, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; editingTruck: Truck | null;
  form: TruckFormData; errors: TruckFormErrors;
  onFormChange: (patch: Partial<TruckFormData>) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingTruck ? t("trucks.edit") : t("trucks.add")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="plateNumber">{t("trucks.fields.plateNumber")}</Label>
            <Input id="plateNumber" placeholder={t("trucks.placeholders.plateNumber")} value={form.plateNumber} onChange={(e) => onFormChange({ plateNumber: e.target.value.toUpperCase() })} />
            {errors.plateNumber && <p className="text-xs text-red-500">{errors.plateNumber}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand">{t("trucks.fields.brand")}</Label>
            <Input id="brand" placeholder={t("trucks.placeholders.brand")} value={form.brand} onChange={(e) => onFormChange({ brand: e.target.value })} />
            {errors.brand && <p className="text-xs text-red-500">{errors.brand}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="model">{t("trucks.fields.model")}</Label>
            <Input id="model" placeholder={t("trucks.placeholders.model")} value={form.model} onChange={(e) => onFormChange({ model: e.target.value })} />
            {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="year">{t("trucks.fields.year")}</Label>
            <Input id="year" type="number" placeholder={t("trucks.placeholders.year")} value={form.year} onChange={(e) => onFormChange({ year: e.target.value })} />
            {errors.year && <p className="text-xs text-red-500">{errors.year}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mileage">{t("trucks.fields.mileage")}</Label>
            <Input id="mileage" type="number" placeholder={t("trucks.placeholders.mileage")} value={form.mileage} onChange={(e) => onFormChange({ mileage: e.target.value })} />
            {errors.mileage && <p className="text-xs text-red-500">{errors.mileage}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="truckStatus">{t("trucks.fields.status")}</Label>
            <Select value={form.status} onValueChange={(val) => onFormChange({ status: val as Truck["status"] })}>
              <SelectTrigger id="truckStatus"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("trucks.status.available")}</SelectItem>
                <SelectItem value="on_trip">{t("trucks.status.on_trip")}</SelectItem>
                <SelectItem value="in_service">{t("trucks.status.in_service")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="itpExpiry">{t("trucks.fields.itpExpiry")}</Label>
            <Input id="itpExpiry" type="date" value={form.itpExpiry} onChange={(e) => onFormChange({ itpExpiry: e.target.value })} />
            {errors.itpExpiry && <p className="text-xs text-red-500">{errors.itpExpiry}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rcaExpiry">{t("trucks.fields.rcaExpiry")}</Label>
            <Input id="rcaExpiry" type="date" value={form.rcaExpiry} onChange={(e) => onFormChange({ rcaExpiry: e.target.value })} />
            {errors.rcaExpiry && <p className="text-xs text-red-500">{errors.rcaExpiry}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="vignetteExpiry">{t("trucks.fields.vignetteExpiry")}</Label>
            <Input id="vignetteExpiry" type="date" value={form.vignetteExpiry} onChange={(e) => onFormChange({ vignetteExpiry: e.target.value })} />
            {errors.vignetteExpiry && <p className="text-xs text-red-500">{errors.vignetteExpiry}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("trucks.cancel")}</Button>
          <Button onClick={onSubmit}>{editingTruck ? t("trucks.save") : t("trucks.actions.add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign Dialog ──────────────────────────────────────────

function AssignDialog({ open, onOpenChange, truck, drivers, selectedDriverId, onDriverChange, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; truck: Truck | null;
  drivers: Driver[]; selectedDriverId: string; onDriverChange: (id: string) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("trucks.assignTitle", { plateNumber: truck?.plateNumber ?? "" })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="assignDriver">{t("trucks.assign.selectDriver")}</Label>
            <Select value={selectedDriverId || "none"} onValueChange={(val) => onDriverChange(val === "none" ? "" : val)}>
              <SelectTrigger id="assignDriver"><SelectValue placeholder={t("trucks.placeholders.selectDriver")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("trucks.placeholders.noDriver")}</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}{d.truckId && d.truckId !== truck?.id ? t("trucks.assign.hasTrack") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("trucks.actions.cancel")}</Button>
          <Button onClick={onSubmit}>{t("trucks.actions.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── TrucksSection ──────────────────────────────────────────

export function TrucksSection({ drivers, trucks, onDataChange }: {
  drivers: Driver[]; trucks: Truck[]; onDataChange: () => void;
}) {
  const { t } = useTranslation();
  const isMobile = useMobile(640);

  const STATUS_CLASS: Record<Truck["status"], string> = {
    available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  };

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
  const handleOpenEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setForm({ plateNumber: truck.plateNumber, brand: truck.brand, model: truck.model, year: String(truck.year), mileage: String(truck.mileage), status: truck.status, itpExpiry: truck.itpExpiry, rcaExpiry: truck.rcaExpiry, vignetteExpiry: truck.vignetteExpiry });
    setErrors({}); setTruckDialogOpen(true);
  };

  const handleSubmit = () => {
    const errs = validateTruckForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (editingTruck) {
      updateItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === editingTruck.id, (tr) => ({ ...tr, plateNumber: form.plateNumber.trim().toUpperCase(), brand: form.brand.trim(), model: form.model.trim(), year: Number(form.year), mileage: Number(form.mileage), status: form.status, itpExpiry: form.itpExpiry, rcaExpiry: form.rcaExpiry, vignetteExpiry: form.vignetteExpiry }));
      toast.success(t("trucks.toastUpdated"));
    } else {
      addItem<Truck>(STORAGE_KEYS.trucks, { id: generateId(), plateNumber: form.plateNumber.trim().toUpperCase(), brand: form.brand.trim(), model: form.model.trim(), year: Number(form.year), mileage: Number(form.mileage), status: form.status, itpExpiry: form.itpExpiry, rcaExpiry: form.rcaExpiry, vignetteExpiry: form.vignetteExpiry });
      toast.success(t("trucks.toastAdded"));
    }
    setTruckDialogOpen(false); onDataChange();
  };

  const handleDelete = () => {
    if (!deleteTruckId) return;
    updateItem<Driver>(STORAGE_KEYS.drivers, (d) => d.truckId === deleteTruckId, (d) => ({ ...d, truckId: undefined }));
    removeItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === deleteTruckId);
    toast.success(t("trucks.toastDeleted"));
    setDeleteTruckId(null); onDataChange();
  };

  const handleOpenAssign = (truck: Truck) => {
    setAssigningTruck(truck);
    setSelectedDriverId(drivers.find((d) => d.truckId === truck.id)?.id ?? "");
    setAssignDialogOpen(true);
  };

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
  ], [drivers, t]);

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