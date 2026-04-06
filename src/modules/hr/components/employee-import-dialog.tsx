import * as React from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCollection, addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/use-audit-log";

// ── Validare CSV ───────────────────────────────────────────

const REQUIRED_FIELDS = ["name", "position", "department", "phone", "email", "hireDate", "salary"];

const COLUMN_MAP: Record<string, string> = {
  "nume": "name",
  "functie": "position",
  "functie/pozitie": "position",
  "departament": "department",
  "telefon": "phone",
  "email": "email",
  "data angajarii": "hireDate",
  "data angajarii (yyyy-mm-dd)": "hireDate",
  "salariu": "salary",
  "salariu (ron)": "salary",
  "name": "name",
  "position": "position",
  "department": "department",
  "phone": "phone",
  "hiredate": "hireDate",
  "hire date": "hireDate",
  "salary": "salary",
  "salary (ron)": "salary",
};

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<Employee>;
  errors: string[];
  isDuplicate: boolean;
  rowIndex: number;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function validateDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function parseRows(
  raw: Record<string, string>[],
  existing: Employee[],
  t: (k: string) => string,
): ParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];
    const mapped: Partial<Employee & { salary: number }> = {};

    for (const [col, val] of Object.entries(row)) {
      const key = COLUMN_MAP[normalizeHeader(col)];
      if (key) (mapped as Record<string, unknown>)[key] = val.trim();
    }

    for (const field of REQUIRED_FIELDS) {
      if (!mapped[field as keyof typeof mapped]) {
        errors.push(t("employees.import.errorRequired").replace("{{field}}", field));
      }
    }

    if (mapped.hireDate && !validateDate(mapped.hireDate)) {
      errors.push(t("employees.import.errorDate"));
    }

    if (mapped.salary !== undefined) {
      const salNum = parseFloat(String(mapped.salary));
      if (isNaN(salNum) || salNum < 0) {
        errors.push(t("employees.import.errorSalary"));
      } else {
        (mapped as Record<string, unknown>).salary = salNum;
      }
    }

    const isDuplicate = existing.some(
      (e) =>
        e.name.toLowerCase() === (mapped.name ?? "").toLowerCase() &&
        e.department.toLowerCase() === (mapped.department ?? "").toLowerCase(),
    );

    return { raw: row, mapped, errors, isDuplicate, rowIndex: i + 1 };
  });
}

// ── Import Dialog ──────────────────────────────────────────

export function EmployeeImportDialog({
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
  const { log } = useAuditLog();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState("");

  const existing = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const validRows = rows.filter((r) => r.errors.length === 0 && !r.isDuplicate);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const duplicateRows = rows.filter((r) => r.errors.length === 0 && r.isDuplicate);

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseRows(results.data as Record<string, string>[], existing, t);
        setRows(parsed);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleConfirm = () => {
    let added = 0;
    for (const row of validRows) {
      addItem<Employee>(STORAGE_KEYS.employees, {
        id: generateId(),
        name: row.mapped.name ?? "",
        position: row.mapped.position ?? "",
        department: row.mapped.department ?? "",
        phone: row.mapped.phone ?? "",
        email: row.mapped.email ?? "",
        hireDate: row.mapped.hireDate ?? "",
        salary: typeof row.mapped.salary === "number" ? row.mapped.salary : 0,
        documents: [],
      });
      added++;
    }

    const skipped = duplicateRows.length;
    if (added > 0) {
      log({
        action: "create",
        entity: "employee",
        entityId: "bulk-import",
        entityLabel: `${added} employees`,
        detailKey: "activityLog.details.employeesImported",
        detailParams: { count: String(added) },
      });
    }
    if (added > 0 && skipped > 0) {
      toast.success(t("employees.import.toastPartial", { added, skipped }));
    } else if (added > 0) {
      toast.success(t("employees.import.toastSuccess", { count: added }));
    } else {
      toast.info(t("employees.import.toastAllSkipped"));
    }

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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className={cn(
        "flex flex-col gap-4",
        isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-2xl",
      )}>
        <DialogHeader>
          <DialogTitle>{t("employees.import.title")}</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-8 w-8 opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("employees.import.dropzone")}</p>
              <p className="text-xs mt-1 text-muted-foreground">{t("employees.import.dropzoneHint")}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-3")}>
              <div className="flex items-center gap-2 rounded-lg border-2 border-green-500 bg-green-500/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">{t("employees.import.validCount", { count: validRows.length })}</span>
              </div>
              <div className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                invalidRows.length > 0 ? "border-red-500 bg-red-500/10" : "border-muted bg-muted/30",
              )}>
                <AlertTriangle className={cn("h-4 w-4 shrink-0", invalidRows.length > 0 ? "text-red-500" : "text-muted-foreground")} />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">{t("employees.import.invalidCount", { count: invalidRows.length })}</span>
              </div>
              <div className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                duplicateRows.length > 0 ? "border-yellow-500 bg-yellow-500/10" : "border-muted bg-muted/30",
              )}>
                <AlertTriangle className={cn("h-4 w-4 shrink-0", duplicateRows.length > 0 ? "text-yellow-500" : "text-muted-foreground")} />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{t("employees.import.duplicateCount", { count: duplicateRows.length })}</span>
              </div>
            </div>

            <ScrollArea className="h-[220px] rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-foreground font-semibold">#</TableHead>
                      <TableHead className="min-w-[140px] text-foreground font-semibold">{t("employees.fields.name")}</TableHead>
                      <TableHead className="min-w-[120px] hidden sm:table-cell">{t("employees.fields.department")}</TableHead>
                      <TableHead className="min-w-[200px] text-foreground font-semibold">{t("employees.import.errorsCol")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.rowIndex}
                        className={cn(
                          row.errors.length > 0
                          ? "bg-red-500/10 hover:bg-red-500/15"
                          : row.isDuplicate
                          ? "bg-yellow-500/10 hover:bg-yellow-500/15"
                          : "bg-green-500/5 hover:bg-green-500/10",
                        )}
                      >
                        <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{row.mapped.name ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap">{row.mapped.department ?? "—"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap font-medium">
                          {row.errors.length > 0 ? (
                            <span className="text-red-600 dark:text-red-400">{row.errors.join(" | ")}</span>
                          ) : row.isDuplicate ? (
                            <span className="text-yellow-600 dark:text-yellow-400">{t("employees.import.duplicate")}</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">✓ {t("employees.import.rowValid")}</span>
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

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-green-500/20 border border-green-500" />
              {t("employees.import.legendValid")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-500/20 border border-red-500" />
              {t("employees.import.legendInvalid")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500" />
              {t("employees.import.legendDuplicate")}
            </span>
          </div>
        )}
        <DialogFooter className={cn("gap-2", isMobile && "flex-col")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("employees.actions.cancel")}
          </Button>
          {rows.length > 0 && (
            <Button onClick={handleConfirm} disabled={validRows.length === 0} className={cn(isMobile && "w-full")}>
              {validRows.length > 0
                ? t("employees.import.confirm", { count: validRows.length })
                : t("employees.import.noValidRows")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
