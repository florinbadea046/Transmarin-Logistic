import * as React from "react";
import { Upload, X, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import type { Truck } from "@/modules/transport/types";
import { addItem, generateId, getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { cn } from "@/lib/utils";

import { type TruckParsedRow, parseTruckRows } from "./trucks-import-utils";

export function TruckImportDialog({
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
