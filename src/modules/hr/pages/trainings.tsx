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
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Award,
  FileText,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DataTablePagination } from "@/components/data-table/pagination";
import { getCollection, removeItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, Training, TrainingCertificate } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";

import {
  getTrainingColumns,
  ALL_STATUSES,
  ALL_TYPES,
} from "./_components/trainings-columns";
import { TrainingDialog } from "./_components/trainings-dialog";
import { generateCertificatePdf } from "./_components/trainings-pdf";
import { getEmpName } from "./_components/evaluations-types";

export default function TrainingsPage() {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();

  const [employees, setEmployees] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );

  const [data, setData] = React.useState<Training[]>(() =>
    getCollection<Training>(STORAGE_KEYS.trainings),
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL_STATUSES);
  const [typeFilter, setTypeFilter] = React.useState(ALL_TYPES);

  // CRUD dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTraining, setEditTraining] = React.useState<Training | undefined>();

  // Delete state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Training | null>(null);

  // Participants view / certificate issue dialog
  const [participantsOpen, setParticipantsOpen] = React.useState(false);
  const [participantsTraining, setParticipantsTraining] =
    React.useState<Training | null>(null);

  const columns = React.useMemo(() => getTrainingColumns(t), [t]);

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
      const title = normalize(row.original.title);
      const trainer = normalize(row.original.trainer);
      return title.includes(q) || trainer.includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const refreshData = () => {
    setData(getCollection<Training>(STORAGE_KEYS.trainings));
    setEmployees(getCollection<Employee>(STORAGE_KEYS.employees));
  };

  const handleStatusFilter = (v: string) => {
    setStatusFilter(v);
    table.getColumn("status")?.setFilterValue(v === ALL_STATUSES ? undefined : v);
    table.setPageIndex(0);
  };

  const handleTypeFilter = (v: string) => {
    setTypeFilter(v);
    table.getColumn("type")?.setFilterValue(v === ALL_TYPES ? undefined : v);
    table.setPageIndex(0);
  };

  const openAdd = () => {
    setEditTraining(undefined);
    setDialogOpen(true);
  };

  const openEdit = (tr: Training) => {
    setEditTraining(tr);
    setDialogOpen(true);
  };

  const openParticipants = (tr: Training) => {
    setParticipantsTraining(tr);
    setParticipantsOpen(true);
  };

  const confirmDelete = (tr: Training) => {
    setDeleteTarget(tr);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeItem<Training>(
      STORAGE_KEYS.trainings,
      (tr) => tr.id === deleteTarget.id,
    );
    log({
      action: "delete",
      entity: "training",
      entityId: deleteTarget.id,
      entityLabel: deleteTarget.title,
      details: `${deleteTarget.type} — ${deleteTarget.status}`,
    });
    toast.success(t("trainings.toast.deleted"));
    refreshData();
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  // Issue certificate for a participant
  const issueCertificate = (training: Training, employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const already = training.issuedCertificates.find(
      (c) => c.employeeId === employeeId,
    );

    let certificate: TrainingCertificate;
    if (already) {
      certificate = already;
      toast.info(t("trainings.toast.redownloaded"));
    } else {
      certificate = {
        id: generateId(),
        employeeId,
        issuedAt: new Date().toISOString(),
      };
      const updated: Training = {
        ...training,
        issuedCertificates: [...training.issuedCertificates, certificate],
      };
      updateItem<Training>(
        STORAGE_KEYS.trainings,
        (tr) => tr.id === training.id,
        () => updated,
      );
      log({
        action: "create",
        entity: "training",
        entityId: training.id,
        entityLabel: training.title,
        details: `Certificat emis pentru ${emp.name}`,
      });
      refreshData();
      // keep dialog in sync
      setParticipantsTraining(updated);
      toast.success(t("trainings.toast.certificateIssued"));
    }

    generateCertificatePdf({
      trainingTitle: training.title,
      employeeName: emp.name,
      issuedAt: certificate.issuedAt,
      trainer: training.trainer,
      durationHours: training.durationHours,
    });
  };

  // All issued certificates flattened (Tab 2)
  const allIssued = React.useMemo(() => {
    const rows: {
      certId: string;
      training: Training;
      employeeId: string;
      employeeName: string;
      issuedAt: string;
    }[] = [];
    data.forEach((tr) => {
      tr.issuedCertificates.forEach((c) => {
        rows.push({
          certId: c.id,
          training: tr,
          employeeId: c.employeeId,
          employeeName: getEmpName(employees, c.employeeId),
          issuedAt: c.issuedAt,
        });
      });
    });
    return rows.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }, [data, employees]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trainings.title")}</h1>
      </Header>

      <Main>
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">{t("trainings.tabs.list")}</TabsTrigger>
            <TabsTrigger value="certificates">
              {t("trainings.tabs.certificates")}
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Training list ────────────────────────── */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <CardTitle>{t("trainings.listTitle")}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {t("trainings.count", {
                      count: table.getFilteredRowModel().rows.length,
                    })}
                  </span>
                  <Button size="sm" onClick={openAdd}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    {t("trainings.actions.add")}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder={t("trainings.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      table.setPageIndex(0);
                    }}
                    className="max-w-xs"
                  />
                  <Select value={typeFilter} onValueChange={handleTypeFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t("trainings.columns.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TYPES}>
                        {t("trainings.allTypes")}
                      </SelectItem>
                      <SelectItem value="intern">
                        {t("trainings.type.intern")}
                      </SelectItem>
                      <SelectItem value="extern">
                        {t("trainings.type.extern")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t("trainings.columns.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUSES}>
                        {t("trainings.allStatuses")}
                      </SelectItem>
                      <SelectItem value="planificat">
                        {t("trainings.status.planificat")}
                      </SelectItem>
                      <SelectItem value="in_curs">
                        {t("trainings.status.in_curs")}
                      </SelectItem>
                      <SelectItem value="finalizat">
                        {t("trainings.status.finalizat")}
                      </SelectItem>
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
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={t("trainings.actions.menu")}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => openParticipants(row.original)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t("trainings.actions.viewParticipants")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => openEdit(row.original)}
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {t("trainings.actions.edit")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => confirmDelete(row.original)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("trainings.actions.delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              ) : (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
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
                            {t("trainings.empty")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <DataTablePagination table={table} pageSizes={[10, 20]} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: Issued certificates ──────────────────── */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle>{t("trainings.certificates.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("trainings.certificates.employee")}
                        </TableHead>
                        <TableHead>
                          {t("trainings.certificates.training")}
                        </TableHead>
                        <TableHead>{t("trainings.certificates.date")}</TableHead>
                        <TableHead>
                          {t("trainings.certificates.issuedAt")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("trainings.certificates.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allIssued.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {t("trainings.certificates.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        allIssued.map((row) => (
                          <TableRow key={row.certId}>
                            <TableCell className="font-medium">
                              {row.employeeName}
                            </TableCell>
                            <TableCell>{row.training.title}</TableCell>
                            <TableCell>{formatDate(row.training.date)}</TableCell>
                            <TableCell>
                              {new Date(row.issuedAt).toLocaleDateString("ro-RO")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  generateCertificatePdf({
                                    trainingTitle: row.training.title,
                                    employeeName: row.employeeName,
                                    issuedAt: row.issuedAt,
                                    trainer: row.training.trainer,
                                    durationHours: row.training.durationHours,
                                  })
                                }
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                {t("trainings.certificates.download")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* Create/Edit dialog */}
      <TrainingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        training={editTraining}
        onSaved={refreshData}
      />

      {/* Participants dialog (+ issue certificate per participant) */}
      <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {participantsTraining?.title ?? ""} —{" "}
              {t("trainings.participantsDialog.title")}
            </DialogTitle>
          </DialogHeader>
          {participantsTraining && (
            <div className="space-y-2">
              {participantsTraining.participantIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("trainings.participantsDialog.empty")}
                </p>
              ) : (
                participantsTraining.participantIds.map((empId) => {
                  const emp = employees.find((e) => e.id === empId);
                  if (!emp) return null;
                  const hasCert = participantsTraining.issuedCertificates.some(
                    (c) => c.employeeId === empId,
                  );
                  const isCompleted = participantsTraining.status === "finalizat";
                  return (
                    <div
                      key={empId}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{emp.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {emp.position} — {emp.department}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasCert && (
                          <Badge variant="default" className="whitespace-nowrap">
                            {t("trainings.participantsDialog.issued")}
                          </Badge>
                        )}
                        {isCompleted && (
                          <Button
                            size="sm"
                            variant={hasCert ? "outline" : "default"}
                            onClick={() =>
                              issueCertificate(participantsTraining, empId)
                            }
                          >
                            <Award className="h-3.5 w-3.5 mr-1.5" />
                            {hasCert
                              ? t("trainings.actions.redownload")
                              : t("trainings.actions.generateCertificate")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {participantsTraining.status !== "finalizat" && (
                <p className="text-xs text-muted-foreground pt-2">
                  {t("trainings.participantsDialog.notCompleted")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("trainings.actions.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("trainings.actions.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("trainings.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("trainings.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
