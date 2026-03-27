import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { Upload, X, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import Papa from "papaparse";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { getCollection, addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import EmployeeDialog from "../components/employee-dialog";
import { EmployeeExportMenu } from "../components/employee-export-menu";
import { EmployeeRow } from "../components/employee-row";
import { getEmployeeDepartmentLabel } from "../utils/department-label";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ALL_DEPARTMENTS = "__all__";

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

function ImportDialog({
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
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState("");

  const existing = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [open],
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
        salary: (row.mapped as Record<string, unknown>).salary as number ?? 0,
        documents: [],
      });
      added++;
    }

    const skipped = duplicateRows.length;
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
            {/* Fisier + reset */}
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Sumar */}
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

            {/* Tabel preview cu scroll vertical (ScrollArea) si scroll orizontal (div interior) */}
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

// ── Coloane ────────────────────────────────────────────────

function getColumns(t: (key: string) => string): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: "name",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.name")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "position",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.position")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("position")}</div>
      ),
    },
    {
      accessorKey: "department",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.department")} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {getEmployeeDepartmentLabel(t, String(row.getValue("department")))}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === ALL_DEPARTMENTS) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "phone",
      header: t("employees.fields.phone"),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("phone")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "email",
      header: t("employees.fields.email"),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("email")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "hireDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.hireDate")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{formatDate(row.getValue("hireDate"))}</div>
      ),
    },
    {
      accessorKey: "salary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.salary")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap font-medium">
          {(row.getValue("salary") as number).toLocaleString("ro-RO")} RON
        </div>
      ),
      sortingFn: (a, b, id) => {
        const av = (a.getValue(id) as number) ?? 0;
        const bv = (b.getValue(id) as number) ?? 0;
        return av === bv ? 0 : av > bv ? 1 : -1;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: () => null,
    },
  ];
}

// ── Pagina ─────────────────────────────────────────────────

export default function EmployeesPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const [data, setData] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState(ALL_DEPARTMENTS);
  const [importOpen, setImportOpen] = React.useState(false);

  const columns = React.useMemo(() => getColumns(t), [t]);

  const departments = React.useMemo(() => {
    return [
      { value: ALL_DEPARTMENTS, label: t("employees.filters.all") },
      ...EMPLOYEE_DEPARTMENTS.map((department) => ({
        value: department,
        label: getEmployeeDepartmentLabel(t, department),
      })),
    ];
  }, [t]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, value) => {
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const q = normalize(String(value));
      if (!q) return true;
      return (
        normalize(String(row.getValue("name"))).includes(q) ||
        normalize(String(row.getValue("position"))).includes(q) ||
        normalize(String(row.getValue("email"))).includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
  });

  const handleDeptChange = (v: string) => {
    setDept(v);
    table.getColumn("department")?.setFilterValue(v === ALL_DEPARTMENTS ? undefined : v);
    table.setPageIndex(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    table.setPageIndex(0);
  };

  const refreshData = () => setData(getCollection<Employee>(STORAGE_KEYS.employees));

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("employees.title")}</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <div className={cn(
              "flex flex-wrap gap-2",
              isMobile ? "flex-col" : "items-center justify-between",
            )}>
              <CardTitle>{t("employees.listTitle")}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {t("employees.count", { count: table.getFilteredRowModel().rows.length })}
              </span>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-end")}>
                {isMobile ? (
                  <EmployeeExportMenu
                    employees={table.getFilteredRowModel().rows.map((row) => row.original)}
                    iconOnly
                  />
                ) : (
                  <EmployeeExportMenu
                    employees={table.getFilteredRowModel().rows.map((row) => row.original)}
                  />
                )}
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => setImportOpen(true)}
                  title={t("employees.import.button")}
                >
                  <Upload className={cn("h-3.5 w-3.5", !isMobile && "mr-1.5")} />
                  {!isMobile && t("employees.import.button")}
                </Button>
                <EmployeeDialog mode="add" onAdd={refreshData} />
              </div>
            </div>
            <div className={cn("flex flex-wrap gap-2 mt-3", isMobile && "flex-col")}>
              <Input
                placeholder={t("employees.placeholders.search")}
                value={search}
                onChange={handleSearch}
                className={isMobile ? "w-full" : "max-w-xs"}
              />
              <Select value={dept} onValueChange={handleDeptChange}>
                <SelectTrigger className={isMobile ? "w-full" : "w-44"}>
                  <SelectValue placeholder={t("employees.fields.department")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto min-w-0">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(
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
                      <EmployeeRow key={row.id} row={row} setData={setData} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("employees.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>
      </Main>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refreshData}
        isMobile={isMobile}
      />
    </>
  );
}