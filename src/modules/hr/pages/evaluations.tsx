import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Pencil, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DataTablePagination } from "@/components/data-table/pagination";
import {
  getCollection,
  removeItem,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, PerformanceEvaluation } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ALL_STATUSES, getEmpName } from "./_components/evaluations-types";
import { getColumns } from "./_components/evaluations-columns";
import { EvaluationDialog, RadarDialog } from "./_components/evaluations-dialog";

// ── Page ─────────────────────────────────────────────────

export default function EvaluationsPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const { log } = useHrAuditLog();

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const [data, setData] = React.useState<PerformanceEvaluation[]>(() =>
    getCollection<PerformanceEvaluation>(STORAGE_KEYS.evaluations),
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL_STATUSES);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editEval, setEditEval] = React.useState<PerformanceEvaluation | undefined>();
  const [radarOpen, setRadarOpen] = React.useState(false);
  const [radarEval, setRadarEval] = React.useState<PerformanceEvaluation | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<PerformanceEvaluation | null>(null);

  const columns = React.useMemo(() => getColumns(t, employees), [t, employees]);

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
      const empName = getEmpName(employees, row.getValue("employeeId"));
      const evalName = getEmpName(employees, row.getValue("evaluatorId"));
      return normalize(empName).includes(q) || normalize(evalName).includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const handleStatusFilter = (v: string) => {
    setStatusFilter(v);
    table.getColumn("status")?.setFilterValue(v === ALL_STATUSES ? undefined : v);
    table.setPageIndex(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    table.setPageIndex(0);
  };

  const refreshData = () =>
    setData(getCollection<PerformanceEvaluation>(STORAGE_KEYS.evaluations));

  const openAdd = () => {
    setEditEval(undefined);
    setDialogOpen(true);
  };

  const openEdit = (ev: PerformanceEvaluation) => {
    setEditEval(ev);
    setDialogOpen(true);
  };

  const openRadar = (ev: PerformanceEvaluation) => {
    setRadarEval(ev);
    setRadarOpen(true);
  };

  const confirmDelete = (ev: PerformanceEvaluation) => {
    setDeleteTarget(ev);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeItem<PerformanceEvaluation>(
      STORAGE_KEYS.evaluations,
      (e) => e.id === deleteTarget.id,
    );
    log({
      action: "delete",
      entity: "evaluation",
      entityId: deleteTarget.id,
      entityLabel: getEmpName(employees, deleteTarget.employeeId),
      details: `Period: ${deleteTarget.period}`,
    });
    toast.success(t("evaluations.actions.deleteSuccess"));
    refreshData();
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("evaluations.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <div
              className={cn(
                "flex flex-wrap gap-2",
                isMobile ? "flex-col" : "items-center justify-between",
              )}
            >
              <CardTitle>{t("evaluations.listTitle")}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {t("evaluations.count", {
                  count: table.getFilteredRowModel().rows.length,
                })}
              </span>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t("evaluations.add")}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className={cn("flex flex-wrap gap-2", isMobile && "flex-col")}>
              <Input
                placeholder={t("evaluations.searchPlaceholder")}
                value={search}
                onChange={handleSearch}
                className={isMobile ? "w-full" : "max-w-xs"}
              />
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className={isMobile ? "w-full" : "w-44"}>
                  <SelectValue placeholder={t("evaluations.columns.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>
                    {t("evaluations.allStatuses")}
                  </SelectItem>
                  <SelectItem value="draft">{t("evaluations.status.draft")}</SelectItem>
                  <SelectItem value="final">{t("evaluations.status.final")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto min-w-0">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
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
                        {row.getVisibleCells().map((cell) =>
                          cell.column.id === "actions" ? (
                            <TableCell key={cell.id}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("evaluations.actions.menu", "Evaluation actions")}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openRadar(row.original)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t("evaluations.actions.view")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(row.original)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t("evaluations.actions.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => confirmDelete(row.original)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("evaluations.actions.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          ) : (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("evaluations.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} pageSizes={[10, 20]} />
          </CardContent>
        </Card>
      </Main>

      {/* Create/Edit dialog */}
      <EvaluationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        evaluation={editEval}
        onSave={refreshData}
      />

      {/* Radar + history dialog */}
      <RadarDialog
        open={radarOpen}
        onOpenChange={setRadarOpen}
        evaluation={radarEval}
        employees={employees}
        allEvaluations={data}
      />

      {/* Delete alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("evaluations.actions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("evaluations.actions.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("evaluations.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("evaluations.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
