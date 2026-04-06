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
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Star, Plus, Pencil, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import {
  getCollection,
  addItem,
  updateItem,
  removeItem,
  generateId,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type {
  Employee,
  PerformanceEvaluation,
  CriterionScore,
} from "@/modules/hr/types";
import { EVALUATION_CRITERIA } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Star Rating ───────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= value
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30",
            !readonly && "cursor-pointer hover:text-yellow-400",
          )}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────

const ALL_STATUSES = "__all__";

function calcAverage(criteria: CriterionScore[]): number {
  if (!criteria.length) return 0;
  const sum = criteria.reduce((s, c) => s + c.score, 0);
  return Math.round((sum / criteria.length) * 100) / 100;
}

function getEmpName(employees: Employee[], id: string): string {
  return employees.find((e) => e.id === id)?.name ?? id;
}

// ── Evaluation Dialog ─────────────────────────────────────

interface EvalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  evaluation?: PerformanceEvaluation;
  onSave: () => void;
}

function EvaluationDialog({
  open,
  onOpenChange,
  employees,
  evaluation,
  onSave,
}: EvalDialogProps) {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const isEdit = !!evaluation;

  const defaultCriteria = (): CriterionScore[] =>
    EVALUATION_CRITERIA.map((c) => ({ criterion: c, score: 0, comment: "" }));

  const [employeeId, setEmployeeId] = React.useState("");
  const [evaluatorId, setEvaluatorId] = React.useState("");
  const [period, setPeriod] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "final">("draft");
  const [criteria, setCriteria] = React.useState<CriterionScore[]>(defaultCriteria());
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setEmployeeId(evaluation?.employeeId ?? "");
      setEvaluatorId(evaluation?.evaluatorId ?? "");
      setPeriod(evaluation?.period ?? "");
      setStatus(evaluation?.status ?? "draft");
      setCriteria(
        evaluation?.criteria?.length
          ? evaluation.criteria.map((c) => ({ ...c }))
          : defaultCriteria(),
      );
      setErrors([]);
    }
  }, [open, evaluation]);

  const updateCriterion = (
    idx: number,
    field: "score" | "comment",
    value: number | string,
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  const avg = calcAverage(criteria);

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!employeeId) errs.push(t("evaluations.dialog.validation.employeeRequired"));
    if (!evaluatorId) errs.push(t("evaluations.dialog.validation.evaluatorRequired"));
    if (!period) errs.push(t("evaluations.dialog.validation.periodRequired"));
    if (criteria.some((c) => c.score < 1 || c.score > 5))
      errs.push(t("evaluations.dialog.validation.scoresRequired"));
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const payload: PerformanceEvaluation = {
      id: evaluation?.id ?? generateId(),
      employeeId,
      evaluatorId,
      period,
      criteria,
      averageScore: calcAverage(criteria),
      status,
      createdAt: evaluation?.createdAt ?? new Date().toISOString(),
    };

    const empName = getEmpName(employees, employeeId);

    if (isEdit) {
      updateItem<PerformanceEvaluation>(
        STORAGE_KEYS.evaluations,
        (e) => e.id === evaluation!.id,
        () => payload,
      );
      log({
        action: "update",
        entity: "evaluation",
        entityId: payload.id,
        entityLabel: empName,
        details: `Score: ${payload.averageScore}/5`,
      });
    } else {
      addItem<PerformanceEvaluation>(STORAGE_KEYS.evaluations, payload);
      log({
        action: "create",
        entity: "evaluation",
        entityId: payload.id,
        entityLabel: empName,
        details: `Score: ${payload.averageScore}/5`,
      });
    }

    toast.success(
      isEdit
        ? t("evaluations.dialog.editTitle")
        : t("evaluations.dialog.addTitle"),
    );
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEdit
              ? t("evaluations.dialog.editTitle")
              : t("evaluations.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Angajat + Evaluator — 2 coloane pe desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setEvaluatorId(""); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={evaluatorId} onValueChange={setEvaluatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.selectEvaluator")} />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((e) => {
                    if (e.id === employeeId) return false;
                    const pos = e.position.toLowerCase();
                    return pos.includes("director") || pos.includes("manager");
                  })
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.position}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Perioadă + Status — 2 coloane pe desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder={t("evaluations.dialog.periodPlaceholder")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "final")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("evaluations.dialog.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("evaluations.status.draft")}</SelectItem>
                <SelectItem value="final">{t("evaluations.status.final")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Criterii — compact */}
          <div className="space-y-2 pt-1">
            {criteria.map((c, idx) => (
              <div key={c.criterion} className="rounded-md border p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-medium">
                    {t(`evaluations.criteria.${c.criterion}`)}
                  </span>
                  <StarRating
                    value={c.score}
                    onChange={(v) => updateCriterion(idx, "score", v)}
                  />
                </div>
                <Input
                  placeholder={t("evaluations.dialog.commentPlaceholder")}
                  value={c.comment}
                  onChange={(e) => updateCriterion(idx, "comment", e.target.value)}
                  className="text-xs sm:text-sm h-8"
                />
              </div>
            ))}
          </div>

          {/* Scor mediu */}
          <div className="flex items-center justify-center gap-2 rounded-md bg-muted/50 p-2">
            <span className="text-xs sm:text-sm font-medium">
              {t("evaluations.dialog.averageScore")}:
            </span>
            <StarRating value={Math.round(avg)} readonly />
            <span className="text-base sm:text-lg font-bold">{avg.toFixed(2)}</span>
            <span className="text-muted-foreground text-xs">/ 5</span>
          </div>

          {/* Erori */}
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-red-500">{e}</p>
              ))}
            </div>
          )}

          {/* Butoane */}
          <div className="flex gap-2 justify-end pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {t("evaluations.dialog.cancel")}
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} size="sm">{t("evaluations.dialog.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Radar Chart Dialog ────────────────────────────────────

function RadarDialog({
  open,
  onOpenChange,
  evaluation,
  employees,
  allEvaluations,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evaluation: PerformanceEvaluation | null;
  employees: Employee[];
  allEvaluations: PerformanceEvaluation[];
}) {
  const { t } = useTranslation();
  if (!evaluation) return null;

  const radarData = evaluation.criteria.map((c) => ({
    criterion: t(`evaluations.criteria.${c.criterion}`),
    score: c.score,
    fullMark: 5,
  }));

  // Istoric evaluări per angajat
  const history = allEvaluations
    .filter((e) => e.employeeId === evaluation.employeeId && e.id !== evaluation.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("evaluations.radarTitle")} — {getEmpName(employees, evaluation.employeeId)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span>
              <strong>{t("evaluations.columns.evaluator")}:</strong>{" "}
              {getEmpName(employees, evaluation.evaluatorId)}
            </span>
            <span>
              <strong>{t("evaluations.columns.period")}:</strong> {evaluation.period}
            </span>
            <Badge variant={evaluation.status === "final" ? "default" : "secondary"}>
              {t(`evaluations.status.${evaluation.status}`)}
            </Badge>
          </div>

          {/* Radar */}
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
              <Radar
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>

          {/* Detalii criterii */}
          <div className="space-y-2">
            {evaluation.criteria.map((c) => (
              <div key={c.criterion} className="flex items-start gap-2 text-sm">
                <span className="font-medium min-w-[100px]">
                  {t(`evaluations.criteria.${c.criterion}`)}:
                </span>
                <StarRating value={c.score} readonly />
                {c.comment && (
                  <span className="text-muted-foreground italic ml-1">— {c.comment}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t("evaluations.dialog.averageScore")}:
            </span>
            <span className="text-lg font-bold">{evaluation.averageScore.toFixed(2)}</span>
            <span className="text-muted-foreground text-sm">/ 5</span>
          </div>

          {/* Istoric */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold mb-2">{t("evaluations.history")}</h4>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("evaluations.noHistory")}</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 text-sm rounded-md border p-2"
                  >
                    <span className="font-medium">{h.period}</span>
                    <StarRating value={Math.round(h.averageScore)} readonly />
                    <span className="text-muted-foreground">
                      ({h.averageScore.toFixed(2)})
                    </span>
                    <Badge variant={h.status === "final" ? "default" : "secondary"}>
                      {t(`evaluations.status.${h.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Coloane ────────────────────────────────────────────────

function getColumns(
  t: (key: string) => string,
  employees: Employee[],
): ColumnDef<PerformanceEvaluation>[] {
  return [
    {
      accessorKey: "employeeId",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.employee")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">
          {getEmpName(employees, row.getValue("employeeId"))}
        </div>
      ),
      sortingFn: (a, b) => {
        const na = getEmpName(employees, a.getValue("employeeId"));
        const nb = getEmpName(employees, b.getValue("employeeId"));
        return na.localeCompare(nb);
      },
    },
    {
      accessorKey: "evaluatorId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.evaluator")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {getEmpName(employees, row.getValue("evaluatorId"))}
        </div>
      ),
    },
    {
      accessorKey: "period",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.period")} />
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("period")}</div>,
    },
    {
      accessorKey: "averageScore",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.score")} />
      ),
      cell: ({ row }) => {
        const score = row.getValue("averageScore") as number;
        return (
          <div className="flex items-center gap-1.5">
            <StarRating value={Math.round(score)} readonly />
            <span className="text-sm text-muted-foreground">({score.toFixed(2)})</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.status")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "final" ? "default" : "secondary"}>
            {t(`evaluations.status.${status}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || value === ALL_STATUSES) return true;
        return row.getValue(id) === value;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: () => null, // rendered in row
    },
  ];
}

// ── Pagina principală ─────────────────────────────────────

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
            {/* Filtre */}
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

            {/* Tabel */}
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
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                    className="text-red-600"
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

      {/* Dialog creare/editare */}
      <EvaluationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        evaluation={editEval}
        onSave={refreshData}
      />

      {/* Dialog radar + istoric */}
      <RadarDialog
        open={radarOpen}
        onOpenChange={setRadarOpen}
        evaluation={radarEval}
        employees={employees}
        allEvaluations={data}
      />

      {/* Alert ștergere */}
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
