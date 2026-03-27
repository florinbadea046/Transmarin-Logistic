import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
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
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, X, Upload, Plus, GripVertical } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

import type { Order, Trip } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type StatusMeta = Record<
  Order["status"],
  {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>;

function getStatusMeta(t: (k: string) => string): StatusMeta {
  return {
    pending: { label: t("orders.status.pending"), variant: "secondary" },
    assigned: { label: t("orders.status.assigned"), variant: "outline" },
    in_transit: { label: t("orders.status.in_transit"), variant: "default" },
    delivered: { label: t("orders.status.delivered"), variant: "secondary" },
    cancelled: { label: t("orders.status.cancelled"), variant: "destructive" },
  };
}

function makeOrderSchema(t: (k: string) => string) {
  return z.object({
    clientName: z.string().trim().min(1, t("orders.validation.clientRequired")),
    origin: z.string().trim().min(1, t("orders.validation.originRequired")),
    destination: z
      .string()
      .trim()
      .min(1, t("orders.validation.destinationRequired")),
    date: z.date().refine((d) => d instanceof Date && !isNaN(d.getTime()), {
      message: t("orders.validation.dateRequired"),
    }),
    weight: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "string" ? Number(v) : v))
      .refine((n) => typeof n === "number" && Number.isFinite(n), {
        message: t("orders.validation.weightRequired"),
      })
      .refine((n) => n > 0, {
        message: t("orders.validation.weightPositive"),
      }),
    notes: z.string().trim().optional(),
    stops: z.array(z.string()).optional(),
  });
}

type OrderForm = z.infer<ReturnType<typeof makeOrderSchema>>;

function safeRandomId() {
  const c = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `order_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setOrdersToStorage(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  } catch (e) {
    void e;
  }
}

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isDuplicateOrder(
  existing: Order,
  incoming: {
    clientName: string;
    origin: string;
    destination: string;
    date: string;
    weight: number;
  },
  excludeId?: string,
) {
  if (excludeId && existing.id === excludeId) return false;
  const e = existing as any;
  return (
    norm(String(e.clientName ?? "")) === norm(incoming.clientName) &&
    norm(String(e.origin ?? "")) === norm(incoming.origin) &&
    norm(String(e.destination ?? "")) === norm(incoming.destination) &&
    String(e.date ?? "") === incoming.date &&
    round2(Number(e.weight ?? 0)) === round2(incoming.weight)
  );
}

const EMPTY_FORM: OrderForm = {
  clientName: "",
  origin: "",
  destination: "",
  date: new Date(),
  weight: 1,
  notes: "",
  stops: [],
};

function getExportOrderCols(t: (k: string) => string) {
  return [
    { key: "clientName", label: t("orders.fields.client") },
    { key: "origin", label: t("orders.fields.origin") },
    { key: "destination", label: t("orders.fields.destination") },
    { key: "date", label: t("orders.fields.date") },
    { key: "status", label: t("orders.fields.status") },
    { key: "weight", label: t("orders.fields.weight") },
    { key: "notes", label: t("orders.fields.notes") },
  ];
}

function getExportTripCols(t: (k: string) => string) {
  return [
    { key: "id", label: "ID" },
    { key: "orderId", label: t("trips.fields.orderId") },
    { key: "driverId", label: t("trips.fields.driverId") },
    { key: "truckId", label: t("trips.fields.truckId") },
    { key: "date", label: t("trips.fields.date") },
    { key: "kmLoaded", label: t("trips.fields.kmLoaded") },
    { key: "kmEmpty", label: t("trips.fields.kmEmpty") },
    { key: "fuelCost", label: t("trips.fields.fuelCost") },
    { key: "status", label: t("trips.fields.status") },
  ];
}

function toRows<T>(items: T[], cols: { key: string; label: string }[]) {
  return items.map((item) =>
    Object.fromEntries(cols.map((c) => [c.label, (item as any)[c.key] ?? ""])),
  );
}

function exportOrdersPDF(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(t("orders.manage"), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => c.label)],
    body: orders.map((o) => cols.map((c) => String((o as any)[c.key] ?? ""))),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("comenzi.pdf");
}

function exportOrdersExcel(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(orders, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("orders.title"));
  XLSX.writeFile(wb, "comenzi.xlsx");
}

function exportOrdersCSV(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const csv = Papa.unparse(toRows(orders, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "comenzi.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportTripsPDF(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("trips.title"), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => c.label)],
    body: trips.map((tr) => cols.map((c) => String((tr as any)[c.key] ?? ""))),
    startY: 22,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("curse.pdf");
}

function exportTripsExcel(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(trips, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("trips.title"));
  XLSX.writeFile(wb, "curse.xlsx");
}

function exportTripsCSV(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const csv = Papa.unparse(toRows(trips, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "curse.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu({ orders }: { orders: Order[] }) {
  const { t } = useTranslation();
  const trips = getCollection<Trip>(STORAGE_KEYS.trips);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("orders.actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer font-medium text-xs text-muted-foreground"
          disabled
        >
          {t("orders.title")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersPDF(orders, t)}
        >
          {t("orders.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersExcel(orders, t)}
        >
          {t("orders.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersCSV(orders, t)}
        >
          {t("orders.actions.exportCsv")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer font-medium text-xs text-muted-foreground"
          disabled
        >
          {t("trips.title")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsPDF(trips, t)}
        >
          {t("orders.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsExcel(trips, t)}
        >
          {t("orders.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsCSV(trips, t)}
        >
          {t("orders.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ImportRow = {
  raw: Record<string, string>;
  parsed: Partial<Order> | null;
  errors: string[];
  index: number;
};

function parseImportRow(
  raw: Record<string, string>,
  index: number,
  t: (k: string) => string,
): ImportRow {
  const errors: string[] = [];
  const clientName = raw["Client"]?.trim() || raw["clientName"]?.trim() || "";
  const origin =
    raw["Origine"]?.trim() ||
    raw["Origin"]?.trim() ||
    raw["origin"]?.trim() ||
    "";
  const destination =
    raw["Destinatie"]?.trim() ||
    raw["Destination"]?.trim() ||
    raw["destination"]?.trim() ||
    "";
  const date =
    raw["Data"]?.trim() || raw["Date"]?.trim() || raw["date"]?.trim() || "";
  const weightRaw =
    raw["Greutate (t)"]?.trim() ||
    raw["Weight (t)"]?.trim() ||
    raw["weight"]?.trim() ||
    "";
  const notes =
    raw["Note"]?.trim() || raw["Notes"]?.trim() || raw["notes"]?.trim() || "";
  const statusRaw = raw["Status"]?.trim() || raw["status"]?.trim() || "";

  if (!clientName) errors.push(t("orders.validation.clientRequired"));
  if (!origin) errors.push(t("orders.validation.originRequired"));
  if (!destination) errors.push(t("orders.validation.destinationRequired"));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    errors.push(t("orders.import.invalidDate"));

  const weight = parseFloat(weightRaw);
  if (!weightRaw || isNaN(weight) || weight <= 0)
    errors.push(t("orders.validation.weightPositive"));

  const validStatuses: Order["status"][] = [
    "pending",
    "assigned",
    "in_transit",
    "delivered",
    "cancelled",
  ];
  const status: Order["status"] = validStatuses.includes(
    statusRaw as Order["status"],
  )
    ? (statusRaw as Order["status"])
    : "pending";

  if (errors.length > 0) {
    return { raw, parsed: null, errors, index };
  }

  return {
    raw,
    parsed: {
      clientName,
      origin,
      destination,
      date,
      weight,
      notes: notes || undefined,
      status,
    },
    errors: [],
    index,
  };
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (rows: Partial<Order>[]) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [step, setStep] = React.useState<"upload" | "preview">("upload");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setRows([]);
      setStep("upload");
    }
  }, [open]);

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data as Record<string, string>[]).map((row, i) =>
          parseImportRow(row, i, t),
        );
        setRows(parsed);
        setStep("preview");
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const validRows = rows.filter((r) => r.errors.length === 0 && r.parsed);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function handleConfirm() {
    onImport(validRows.map((r) => r.parsed!));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[760px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("orders.import.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("orders.import.title")}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 text-center cursor-pointer hover:border-primary transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("orders.import.dropzone")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("orders.import.dropzoneHint")}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 font-medium">
                {t("orders.import.validCount", { count: validRows.length })}
              </span>
              {invalidRows.length > 0 && (
                <span className="text-destructive font-medium">
                  {t("orders.import.invalidCount", {
                    count: invalidRows.length,
                  })}
                </span>
              )}
            </div>

            <div className="overflow-auto rounded-lg border max-h-[50vh]">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("orders.fields.client")}</TableHead>
                    <TableHead>{t("orders.fields.origin")}</TableHead>
                    <TableHead>{t("orders.fields.destination")}</TableHead>
                    <TableHead>{t("orders.fields.date")}</TableHead>
                    <TableHead>{t("orders.fields.weight")}</TableHead>
                    <TableHead>{t("orders.fields.status")}</TableHead>
                    <TableHead>{t("orders.import.errorsCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.index}
                      className={
                        row.errors.length > 0 ? "bg-destructive/10" : ""
                      }
                    >
                      <TableCell>{row.index + 1}</TableCell>
                      <TableCell>
                        {row.raw["Client"] || row.raw["clientName"] || "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Origine"] ||
                          row.raw["Origin"] ||
                          row.raw["origin"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Destinatie"] ||
                          row.raw["Destination"] ||
                          row.raw["destination"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Data"] ||
                          row.raw["Date"] ||
                          row.raw["date"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Greutate (t)"] ||
                          row.raw["Weight (t)"] ||
                          row.raw["weight"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Status"] || row.raw["status"] || "pending"}
                      </TableCell>
                      <TableCell className="text-destructive text-xs">
                        {row.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRows([]);
                setStep("upload");
              }}
            >
              {t("orders.import.reupload")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("orders.cancel")}
          </Button>
          {step === "preview" && validRows.length > 0 && (
            <Button onClick={handleConfirm}>
              {t("orders.import.confirm", { count: validRows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DateButton({
  date,
  placeholder,
  onSelect,
}: {
  date: Date | undefined;
  placeholder: string;
  onSelect: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left text-sm font-normal sm:w-[150px]",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {date ? (
            <span className="tabular-nums">{format(date, "yyyy-MM-dd")}</span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        collisionPadding={20}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface AdvancedFiltersProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  origin: string;
  destination: string;
  onDateFrom: (d: Date | undefined) => void;
  onDateTo: (d: Date | undefined) => void;
  onOrigin: (v: string) => void;
  onDestination: (v: string) => void;
  onReset: () => void;
  hasActive: boolean;
}

function AdvancedFilters({
  dateFrom,
  dateTo,
  origin,
  destination,
  onDateFrom,
  onDateTo,
  onOrigin,
  onDestination,
  onReset,
  hasActive,
}: AdvancedFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateButton
        date={dateFrom}
        placeholder={t("orders.filters.from")}
        onSelect={onDateFrom}
      />
      <DateButton
        date={dateTo}
        placeholder={t("orders.filters.to")}
        onSelect={onDateTo}
      />
      <Input
        value={origin}
        onChange={(e) => onOrigin(e.target.value)}
        placeholder={t("orders.placeholders.filterOrigin")}
        className="h-8 w-full sm:w-[140px]"
      />
      <Input
        value={destination}
        onChange={(e) => onDestination(e.target.value)}
        placeholder={t("orders.placeholders.filterDest")}
        className="h-8 w-full sm:w-[140px]"
      />
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={onReset}
        >
          {t("orders.actions.reset")} <X className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const trips = React.useMemo(() => {
    if (!order) return [];
    return getCollection<Trip>(STORAGE_KEYS.trips).filter(
      (tr) => tr.orderId === order.id,
    );
  }, [order]);

  const totalFuelCost = trips.reduce((sum, tr) => sum + (tr.fuelCost ?? 0), 0);
  const totalKm = trips.reduce(
    (sum, tr) => sum + (tr.kmLoaded ?? 0) + (tr.kmEmpty ?? 0),
    0,
  );
  const costPerKm = totalKm > 0 ? totalFuelCost / totalKm : null;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("orders.detail.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("orders.detail.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3">
            <span className="text-muted-foreground">
              {t("orders.fields.client")}
            </span>
            <span className="font-medium">{order.clientName}</span>
            <span className="text-muted-foreground">
              {t("orders.detail.route")}
            </span>
            <span>
              {order.origin} &rarr; {order.destination}
            </span>
            <span className="text-muted-foreground">
              {t("orders.detail.date")}
            </span>
            <span className="tabular-nums">{order.date}</span>
            <span className="text-muted-foreground">
              {t("orders.detail.status")}
            </span>
            <span>{order.status}</span>
            {order.weight != null && (
              <>
                <span className="text-muted-foreground">
                  {t("orders.detail.weight")}
                </span>
                <span className="tabular-nums">
                  {order.weight} {t("orders.fields.weightUnit")}
                </span>
              </>
            )}
            {order.notes && (
              <>
                <span className="text-muted-foreground">
                  {t("orders.fields.notes")}
                </span>
                <span>{order.notes}</span>
              </>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium">{t("orders.costs.title")}</p>
            {trips.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("orders.costs.noTrips")}
              </p>
            ) : (
              <div className="space-y-1">
                {trips.map((trip, i) => {
                  const km = (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0);
                  const cpk = km > 0 ? trip.fuelCost / km : null;
                  return (
                    <div
                      key={trip.id}
                      className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-b last:border-0 pb-1 last:pb-0"
                    >
                      <span className="text-muted-foreground">
                        {t("orders.costs.trip", { index: i + 1 })}
                      </span>
                      <span className="tabular-nums">{trip.departureDate}</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.kmLoaded")}
                      </span>
                      <span className="tabular-nums">{trip.kmLoaded} km</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.kmEmpty")}
                      </span>
                      <span className="tabular-nums">{trip.kmEmpty} km</span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.fuelCost")}
                      </span>
                      <span className="tabular-nums font-medium">
                        {trip.fuelCost.toFixed(2)} RON
                      </span>
                      <span className="text-muted-foreground">
                        {t("orders.costs.costPerKm")}
                      </span>
                      <span className="tabular-nums">
                        {cpk != null ? `${cpk.toFixed(2)} RON/km` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 pt-2 border-t text-sm font-medium">
              <span>{t("orders.costs.totalFuel")}</span>
              <span className="tabular-nums">
                {totalFuelCost.toFixed(2)} RON
              </span>
              <span>{t("orders.costs.totalCostPerKm")}</span>
              <span className="tabular-nums">
                {costPerKm != null ? `${costPerKm.toFixed(2)} RON/km` : "—"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("orders.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initialValues?: OrderForm;
  onSave: (values: OrderForm) => string | null;
  triggerButton?: React.ReactNode;
}

function OrderFormDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  onSave,
  triggerButton,
}: OrderFormDialogProps) {
  const { t } = useTranslation();
  const [dateOpen, setDateOpen] = React.useState(false);
  const [form, setForm] = React.useState<OrderForm>(
    initialValues ?? EMPTY_FORM,
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OrderForm, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initialValues ?? EMPTY_FORM);
      setErrors({});
      setFormError(null);
      setDateOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    setErrors({});
    setFormError(null);
    const parsed = makeOrderSchema(t).safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof OrderForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof OrderForm | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    const err = onSave(parsed.data);
    if (err) {
      setFormError(err);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDateOpen(false);
      }}
    >
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="clientName">{t("orders.fields.client")} *</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                placeholder={t("orders.placeholders.client")}
              />
              {errors.clientName && (
                <p className="text-xs text-destructive">{errors.clientName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">{t("orders.fields.weight")} *</Label>
              <Input
                id="weight"
                inputMode="decimal"
                type="number"
                step="0.01"
                min={0}
                value={form.weight as any}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value as any }))
                }
                placeholder={t("orders.placeholders.weight")}
              />
              {errors.weight && (
                <p className="text-xs text-destructive">{errors.weight}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="origin">{t("orders.fields.origin")} *</Label>
              <Input
                id="origin"
                value={form.origin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, origin: e.target.value }))
                }
                placeholder={t("orders.placeholders.origin")}
              />
              {errors.origin && (
                <p className="text-xs text-destructive">{errors.origin}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">
                {t("orders.fields.destination")} *
              </Label>
              <Input
                id="destination"
                value={form.destination}
                onChange={(e) =>
                  setForm((p) => ({ ...p, destination: e.target.value }))
                }
                placeholder={t("orders.placeholders.destination")}
              />
              {errors.destination && (
                <p className="text-xs text-destructive">{errors.destination}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("orders.fields.date")} *</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.date && "text-muted-foreground",
                    )}
                  >
                    {form.date ? (
                      <span className="tabular-nums">
                        {format(form.date, "yyyy-MM-dd")}
                      </span>
                    ) : (
                      t("orders.placeholders.selectDate")
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  avoidCollisions={false}
                  className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl w-[260px]"
                >
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={(d) => {
                      if (!d) return;
                      setForm((p) => ({ ...p, date: d }));
                      setDateOpen(false);
                    }}
                    initialFocus
                    fixedWeeks
                    style={{ ["--cell-size" as any]: "24px" }}
                    className="p-1 text-xs w-full"
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">{t("orders.fields.notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder={t("orders.placeholders.notes")}
                className="min-h-[100px]"
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes}</p>
              )}
            </div>

            {/* Stops section */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("orders.fields.stops")}</Label>
              <div className="space-y-2">
                {(form.stops ?? []).map((stop, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={stop}
                      onChange={(e) => {
                        const next = [...(form.stops ?? [])];
                        next[idx] = e.target.value;
                        setForm((p) => ({ ...p, stops: next }));
                      }}
                      placeholder={t("orders.placeholders.stop")}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const next = [...(form.stops ?? [])];
                          next.splice(idx + 1, 0, "");
                          setForm((p) => ({ ...p, stops: next }));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => {
                        const next = (form.stops ?? []).filter(
                          (_, i) => i !== idx,
                        );
                        setForm((p) => ({ ...p, stops: next }));
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      stops: [...(p.stops ?? []), ""],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("orders.stops.add")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("orders.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {t("orders.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const statusMeta = getStatusMeta(t);
  const statusFilterOptions = (
    Object.keys(statusMeta) as Order["status"][]
  ).map((value) => ({ value, label: statusMeta[value].label }));
  const [data, setData] = React.useState<Order[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailOrder, setDetailOrder] = React.useState<Order | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [filterOrigin, setFilterOrigin] = React.useState("");
  const [filterDestination, setFilterDestination] = React.useState("");

  React.useEffect(() => {
    setData(getCollection<Order>(STORAGE_KEYS.orders));
  }, []);

  const filteredData = React.useMemo(() => {
    return data.filter((o) => {
      if (dateFrom || dateTo) {
        const d = parseISO(o.date);
        if (dateFrom && d < startOfDay(dateFrom)) return false;
        if (dateTo && d > endOfDay(dateTo)) return false;
      }
      if (
        filterOrigin.trim() &&
        !o.origin.toLowerCase().includes(filterOrigin.trim().toLowerCase())
      )
        return false;
      if (
        filterDestination.trim() &&
        !o.destination
          .toLowerCase()
          .includes(filterDestination.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [data, dateFrom, dateTo, filterOrigin, filterDestination]);

  const hasAdvancedFilter = !!(
    dateFrom ||
    dateTo ||
    filterOrigin ||
    filterDestination
  );

  function resetAdvancedFilters() {
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterOrigin("");
    setFilterDestination("");
  }

  function handleAdd(values: OrderForm): string | null {
    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };
    if (data.some((o) => isDuplicateOrder(o, payload)))
      return t("orders.duplicate");
    const newOrder = {
      id: safeRandomId(),
      ...payload,
      status: "pending",
      ...(values.notes ? { notes: values.notes } : {}),
      stops: (values.stops ?? []).map((s) => s.trim()).filter(Boolean),
    } as unknown as Order;
    const next = [newOrder, ...data];
    setData(next);
    setOrdersToStorage(next);
    return null;
  }

  function handleEdit(values: OrderForm): string | null {
    if (!editingOrder) return null;
    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };
    if (data.some((o) => isDuplicateOrder(o, payload, editingOrder.id)))
      return t("orders.duplicate");
    const next = data.map((o) =>
      o.id === editingOrder.id
        ? {
            ...o,
            ...payload,
            notes: values.notes ?? "",
            stops: (values.stops ?? []).map((s) => s.trim()).filter(Boolean),
          }
        : o,
    );
    setData(next);
    setOrdersToStorage(next);
    setEditingOrder(null);
    return null;
  }

  function handleDelete() {
    if (!deletingOrder) return;
    const next = data.filter((o) => o.id !== deletingOrder.id);
    setData(next);
    setOrdersToStorage(next);
    setDeleteOpen(false);
    setDeletingOrder(null);
  }

  function handleImport(rows: Partial<Order>[]) {
    let added = 0;
    let skipped = 0;
    const current = getCollection<Order>(STORAGE_KEYS.orders);
    const next = [...current];

    for (const row of rows) {
      const payload = {
        clientName: row.clientName ?? "",
        origin: row.origin ?? "",
        destination: row.destination ?? "",
        date: row.date ?? "",
        weight: row.weight ?? 0,
      };
      if (next.some((o) => isDuplicateOrder(o, payload))) {
        skipped++;
        continue;
      }
      const newOrder: Order = {
        id: safeRandomId(),
        ...payload,
        status: row.status ?? "pending",
        ...(row.notes ? { notes: row.notes } : {}),
      };
      next.unshift(newOrder);
      added++;
    }

    setData(next);
    setOrdersToStorage(next);

    if (added > 0 && skipped === 0) {
      toast.success(t("orders.import.toastSuccess", { count: added }));
    } else if (added > 0 && skipped > 0) {
      toast.success(t("orders.import.toastPartial", { added, skipped }));
    } else {
      toast.error(t("orders.import.toastAllSkipped"));
    }
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setEditOpen(true);
  }
  function openDelete(order: Order) {
    setDeletingOrder(order);
    setDeleteOpen(true);
  }
  function openDetail(order: Order) {
    setDetailOrder(order);
    setDetailOpen(true);
  }

  const editInitialValues: OrderForm | undefined = editingOrder
    ? {
        clientName: editingOrder.clientName,
        origin: editingOrder.origin,
        destination: editingOrder.destination,
        date: new Date(editingOrder.date),
        weight: editingOrder.weight ?? 1,
        notes: editingOrder.notes ?? "",
        stops: editingOrder.stops ?? [],
      }
    : undefined;

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "clientName",
      meta: { label: t("orders.fields.client") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.client")}
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("clientName")}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "origin",
      meta: { label: t("orders.fields.origin") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.origin")}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("origin")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "destination",
      meta: { label: t("orders.fields.destination") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.destination")}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("destination")}</div>,
      enableSorting: true,
    },
    {
      id: "stops",
      meta: { label: t("orders.fields.stops") },
      header: () => (
        <span className="text-xs font-medium">{t("orders.fields.stops")}</span>
      ),
      cell: ({ row }) => {
        const stops = row.original.stops;
        if (!stops || stops.length === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {stops.length}
          </Badge>
        );
      },
      enableSorting: false,
      size: 80,
      minSize: 70,
      maxSize: 90,
    },
    {
      accessorKey: "date",
      meta: { label: t("orders.fields.date") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.date")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums">{row.getValue("date") as string}</div>
      ),
      enableSorting: true,
      size: 130,
      minSize: 120,
      maxSize: 150,
    },
    {
      accessorKey: "status",
      meta: { label: t("orders.fields.status") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.status")}
        />
      ),
      cell: ({ row }) => {
        const value = row.getValue("status") as Order["status"];
        const meta = statusMeta[value];
        return (
          <Badge
            variant={meta.variant ?? "secondary"}
            className="whitespace-nowrap"
          >
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
      size: 140,
      minSize: 130,
      maxSize: 160,
    },
    {
      accessorKey: "weight",
      meta: { label: t("orders.fields.weight") },
      header: ({ column }) => (
        <div className="mx-auto w-fit text-xs">
          <DataTableColumnHeader
            column={column}
            title={t("orders.fields.weight")}
          />
        </div>
      ),
      cell: ({ row }) => {
        const value = row.getValue("weight") as number | undefined;
        return (
          <div className="text-xs tabular-nums text-center">
            {typeof value === "number" ? value : "—"}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (a, b, id) => {
        const av = (a.getValue(id) as number | undefined) ?? -Infinity;
        const bv = (b.getValue(id) as number | undefined) ?? -Infinity;
        return av === bv ? 0 : av > bv ? 1 : -1;
      },
      size: 90,
      minSize: 80,
      maxSize: 110,
    },
    {
      id: "actions",
      header: () => (
        <span className="sr-only">{t("orders.actions.actions")}</span>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label={t("orders.actions.rowOptions")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => openDetail(order)}
                >
                  {t("orders.actions.details")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => openEdit(order)}
                >
                  {t("orders.actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => openDelete(order)}
                >
                  {t("orders.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 56,
      minSize: 48,
      maxSize: 64,
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: filteredData,
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
    columnResizeMode: "onChange",
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("orders.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("orders.manage")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu orders={filteredData} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {t("orders.import.button")}
              </Button>
              <OrderFormDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                title={t("orders.add")}
                onSave={handleAdd}
                triggerButton={<Button>{t("orders.add")}</Button>}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder={t("orders.placeholders.search")}
              searchKey="clientName"
              columnLabels={{
                clientName: t("orders.fields.client"),
                origin: t("orders.fields.origin"),
                destination: t("orders.fields.destination"),
                stops: t("orders.fields.stops"),
                date: t("orders.fields.date"),
                status: t("orders.fields.status"),
                weight: t("orders.fields.weight"),
              }}
              filters={[
                {
                  columnId: "status",
                  title: t("orders.fields.status"),
                  options: statusFilterOptions,
                },
              ]}
            />

            <AdvancedFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              origin={filterOrigin}
              destination={filterDestination}
              onDateFrom={setDateFrom}
              onDateTo={setDateTo}
              onOrigin={setFilterOrigin}
              onDestination={setFilterDestination}
              onReset={resetAdvancedFilters}
              hasActive={hasAdvancedFilter}
            />

            <div className="rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className={
                            header.column.id === "weight"
                              ? "!text-center"
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
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.getSize() }}
                            className={
                              cell.column.id === "weight"
                                ? "!text-center"
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
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("orders.noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />

      <OrderFormDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingOrder(null);
        }}
        title={t("orders.edit")}
        initialValues={editInitialValues}
        onSave={handleEdit}
      />

      <OrderDetailDialog
        order={detailOrder}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailOrder(null);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeletingOrder(null);
        }}
        title={t("orders.delete")}
        desc={
          deletingOrder ? (
            <span
              dangerouslySetInnerHTML={{
                __html: t("orders.confirmDelete", {
                  name: `<strong>${deletingOrder.clientName}</strong>`,
                  origin: deletingOrder.origin,
                  destination: deletingOrder.destination,
                  date: deletingOrder.date,
                }),
              }}
            />
          ) : (
            t("orders.confirmDeleteFallback")
          )
        }
        confirmText={t("orders.actions.delete")}
        cancelBtnText={t("orders.cancel")}
        destructive
        handleConfirm={handleDelete}
      />
    </>
  );
}
