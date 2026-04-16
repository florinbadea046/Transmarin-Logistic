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
import { Plus, Pencil, Trash2, MoreHorizontal, CheckCircle2 } from "lucide-react";
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
import { getCollection, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, Equipment } from "@/modules/hr/types";
import { EQUIPMENT_TYPES, EQUIPMENT_CONDITIONS } from "@/modules/hr/types";
import { formatDate, formatCurrency } from "@/utils/format";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";

import {
  getEquipmentColumns,
  ALL_TYPES,
  ALL_CONDITIONS,
} from "./_components/equipment-columns";
import { EquipmentDialog } from "./_components/equipment-dialog";

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_OPTIONS = [10, 20];

// Coloanele din tab-ul "Neînapoiate" sunt randate static; lista lor dictează
// si colSpan-ul pentru starea goala. Tine-l sincronizat cu <TableHeader>.
const UNRETURNED_COLUMN_KEYS = [
  "type",
  "inventoryNumber",
  "employee",
  "assignedDate",
  "condition",
  "value",
  "actions",
] as const;

export default function EquipmentPage() {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();

  const [employees, setEmployees] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [data, setData] = React.useState<Equipment[]>(() =>
    getCollection<Equipment>(STORAGE_KEYS.equipment),
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState(ALL_TYPES);
  const [conditionFilter, setConditionFilter] = React.useState(ALL_CONDITIONS);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editEquipment, setEditEquipment] = React.useState<
    Equipment | undefined
  >();

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Equipment | null>(
    null,
  );

  const empName = React.useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? id,
    [employees],
  );

  const columns = React.useMemo(
    () => getEquipmentColumns(t, employees),
    [t, employees],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, value) => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      const q = normalize(String(value));
      if (!q) return true;
      const inv = normalize(row.original.inventoryNumber);
      const emp = normalize(empName(row.original.employeeId));
      return inv.includes(q) || emp.includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE_DEFAULT, pageIndex: 0 } },
  });

  const unreturnedData = React.useMemo(() => {
    const employeeIds = new Set(employees.map((e) => e.id));
    const today = new Date().toISOString().slice(0, 10);
    return data.filter((eq) => {
      const effectivelyReturned = eq.returnedDate && eq.returnedDate <= today;
      if (effectivelyReturned) return false;
      const employeeDeparted = !employeeIds.has(eq.employeeId);
      const overdue = eq.returnedDate && eq.returnedDate < today;
      return employeeDeparted || overdue;
    });
  }, [data, employees]);

  const refreshData = () => {
    setData(getCollection<Equipment>(STORAGE_KEYS.equipment));
    setEmployees(getCollection<Employee>(STORAGE_KEYS.employees));
  };

  const handleTypeFilter = (v: string) => {
    setTypeFilter(v);
    table
      .getColumn("type")
      ?.setFilterValue(v === ALL_TYPES ? undefined : v);
    table.setPageIndex(0);
  };

  const handleConditionFilter = (v: string) => {
    setConditionFilter(v);
    table
      .getColumn("condition")
      ?.setFilterValue(v === ALL_CONDITIONS ? undefined : v);
    table.setPageIndex(0);
  };

  const openAdd = () => {
    setEditEquipment(undefined);
    setDialogOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditEquipment(eq);
    setDialogOpen(true);
  };

  const markAsReturned = (eq: Equipment) => {
    const today = new Date().toISOString().slice(0, 10);
    updateItem<Equipment>(
      STORAGE_KEYS.equipment,
      (e) => e.id === eq.id,
      (e) => ({ ...e, returnedDate: today, returnedConfirmed: true }),
    );
    log({
      action: "update",
      entity: "equipment",
      entityId: eq.id,
      entityLabel: `${t(`equipment.type.${eq.type}`)} — ${eq.inventoryNumber}`,
      details: t("equipment.toast.markedReturned"),
    });
    toast.success(t("equipment.toast.markedReturned"));
    refreshData();
  };

  const confirmDelete = (eq: Equipment) => {
    setDeleteTarget(eq);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeItem<Equipment>(
      STORAGE_KEYS.equipment,
      (e) => e.id === deleteTarget.id,
    );
    log({
      action: "delete",
      entity: "equipment",
      entityId: deleteTarget.id,
      entityLabel: `${t(`equipment.type.${deleteTarget.type}`)} — ${deleteTarget.inventoryNumber}`,
    });
    toast.success(t("equipment.toast.deleted"));
    refreshData();
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const renderTableRows = (
    tableInstance: typeof table,
  ) =>
    tableInstance.getRowModel().rows?.length ? (
      tableInstance.getRowModel().rows.map((row) => (
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
                      aria-label={t("equipment.actions.menu")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(row.original)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("equipment.actions.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => confirmDelete(row.original)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("equipment.actions.delete")}
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
          colSpan={tableInstance.getVisibleLeafColumns().length}
          className="h-24 text-center text-muted-foreground"
        >
          {t("equipment.empty")}
        </TableCell>
      </TableRow>
    );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("equipment.title")}</h1>
      </Header>

      <Main>
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              {t("equipment.tabs.active")}
            </TabsTrigger>
            <TabsTrigger value="unreturned">
              {t("equipment.tabs.unreturned")}
              {unreturnedData.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px]">
                  {unreturnedData.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Active equipment ── */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <CardTitle>{t("equipment.listTitle")}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {t("equipment.count", {
                      count: table.getFilteredRowModel().rows.length,
                    })}
                  </span>
                  <Button size="sm" onClick={openAdd}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    {t("equipment.actions.add")}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder={t("equipment.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      table.setPageIndex(0);
                    }}
                    className="max-w-xs"
                  />
                  <Select value={typeFilter} onValueChange={handleTypeFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue
                        placeholder={t("equipment.columns.type")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TYPES}>
                        {t("equipment.allTypes")}
                      </SelectItem>
                      {EQUIPMENT_TYPES.map((et) => (
                        <SelectItem key={et} value={et}>
                          {t(`equipment.type.${et}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={conditionFilter}
                    onValueChange={handleConditionFilter}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue
                        placeholder={t("equipment.columns.condition")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CONDITIONS}>
                        {t("equipment.allConditions")}
                      </SelectItem>
                      {EQUIPMENT_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`equipment.condition.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border overflow-x-auto min-w-0">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                          {hg.headers.map((header) => (
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
                    <TableBody>{renderTableRows(table)}</TableBody>
                  </Table>
                </div>

                <DataTablePagination table={table} pageSizes={PAGE_SIZE_OPTIONS} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Unreturned (departed employees) ── */}
          <TabsContent value="unreturned">
            <Card>
              <CardHeader>
                <CardTitle>{t("equipment.unreturnedTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("equipment.columns.type")}</TableHead>
                        <TableHead>
                          {t("equipment.columns.inventoryNumber")}
                        </TableHead>
                        <TableHead>
                          {t("equipment.columns.employee")}
                        </TableHead>
                        <TableHead>
                          {t("equipment.columns.assignedDate")}
                        </TableHead>
                        <TableHead>
                          {t("equipment.columns.condition")}
                        </TableHead>
                        <TableHead>{t("equipment.columns.value")}</TableHead>
                        <TableHead className="text-right">
                          {t("equipment.columns.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unreturnedData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={UNRETURNED_COLUMN_KEYS.length}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {t("equipment.unreturnedEmpty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        unreturnedData.map((eq) => (
                          <TableRow key={eq.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {t(`equipment.type.${eq.type}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {eq.inventoryNumber}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {eq.employeeName ?? eq.employeeId}
                              <Badge
                                variant="destructive"
                                className="ml-2 text-[10px]"
                              >
                                {t("equipment.departed")}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(eq.assignedDate)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {t(`equipment.condition.${eq.condition}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(eq.value)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsReturned(eq)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                {t("equipment.actions.markReturned")}
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

      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        equipment={editEquipment}
        onSaved={refreshData}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("equipment.actions.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("equipment.actions.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("equipment.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("equipment.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
