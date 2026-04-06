// A37. Cheltuieli Recurente Transport
// Ruta: /transport/recurring-expenses
// TanStack Table: categorie, camion, suma lunara, data urmatoare plata, status
// CRUD cu Zod + buton "Marcheaza platit"
// KPI cards: total fixe/luna, platit, restant
// PieChart distributie categorii
// Responsive: useMobile(640)
// i18n: fara diacritice in cod

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import { getCollection, updateItem, removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import type { RecurringExpense } from "./_components/recurring-expenses-utils";
import { KpiCards } from "./_components/recurring-expenses-kpi-cards";
import { CategoryChart } from "./_components/recurring-expenses-chart";
import { ExpenseDialog } from "./_components/recurring-expenses-dialog";
import { StatusBadge, ExpenseMobileCard } from "./_components/recurring-expenses-mobile-card";

// Re-export types so existing consumers are not broken
export type { RecurringCategory, RecurringStatus, RecurringExpense } from "./_components/recurring-expenses-utils";

// ── Pagina ─────────────────────────────────────────────────

export default function RecurringExpensesPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);

  const [expenses, setExpenses] = React.useState<RecurringExpense[]>(() =>
    getCollection<RecurringExpense>(STORAGE_KEYS.recurringExpenses),
  );
  const trucks = React.useMemo(() => getCollection<Truck>(STORAGE_KEYS.trucks), []);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringExpense | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nextPaymentDate", desc: false }]);

  const refresh = React.useCallback(() => setExpenses(getCollection<RecurringExpense>(STORAGE_KEYS.recurringExpenses)), []);

  const getTruck = React.useCallback((id: string) => trucks.find((tr) => tr.id === id), [trucks]);

  const handleMarkPaid = React.useCallback((expense: RecurringExpense) => {
    updateItem<RecurringExpense>(
      STORAGE_KEYS.recurringExpenses,
      (e) => e.id === expense.id,
      (e) => ({ ...e, status: "platit" }),
    );
    toast.success(t("recurringExpenses.toastMarkPaid"));
    refresh();
  }, [t, refresh]);

  const handleDelete = () => {
    if (!deleteId) return;
    removeItem<RecurringExpense>(STORAGE_KEYS.recurringExpenses, (e) => e.id === deleteId);
    toast.success(t("recurringExpenses.toastDeleted"));
    setDeleteId(null);
    refresh();
  };

  const columns: ColumnDef<RecurringExpense>[] = React.useMemo(() => [
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("recurringExpenses.columns.category")} />,
      cell: ({ row }) => <span>{t(`recurringExpenses.categories.${row.getValue("category")}`)}</span>,
    },
    {
      id: "truck",
      accessorFn: (row) => getTruck(row.truckId)?.plateNumber ?? row.truckId,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("recurringExpenses.columns.truck")} />,
      cell: ({ row }) => {
        const truck = getTruck(row.original.truckId);
        return (
          <div>
            <div className="font-medium">{truck?.plateNumber ?? row.original.truckId}</div>
            <div className="text-xs text-muted-foreground">{truck?.brand} {truck?.model}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("recurringExpenses.columns.description"),
      cell: ({ row }) => <span className="max-w-[180px] truncate block text-sm">{row.getValue("description")}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "monthlyAmount",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("recurringExpenses.columns.monthlyAmount")} />,
      cell: ({ row }) => <span className="font-medium whitespace-nowrap">{(row.getValue("monthlyAmount") as number).toLocaleString("ro-RO")} RON</span>,
    },
    {
      accessorKey: "nextPaymentDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("recurringExpenses.columns.nextPaymentDate")} />,
      cell: ({ row }) => {
        const date = row.getValue("nextPaymentDate") as string;
        const daysLeft = Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date().getTime()) / 86400000);
        return (
          <div>
            <div className="whitespace-nowrap">{date}</div>
            {daysLeft <= 7 && daysLeft >= 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("recurringExpenses.dueIn", { days: daysLeft })}
              </div>
            )}
            {daysLeft < 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("recurringExpenses.overdue")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("recurringExpenses.columns.status")} />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} t={t} />,
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end items-center gap-1">
          {row.original.status === "neplatit" && (
            <Button variant="ghost" size="sm"
              onClick={() => handleMarkPaid(row.original)}
              className="text-green-600 dark:text-green-400 hover:text-green-700 text-xs h-7 px-2">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t("recurringExpenses.actions.markPaid")}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setDialogOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [t, getTruck, handleMarkPaid]);

  const table = useReactTable({
    data: expenses,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      if (!q) return true;
      const truck = getTruck(row.original.truckId);
      return (
        row.original.description.toLowerCase().includes(q) ||
        (truck?.plateNumber ?? "").toLowerCase().includes(q) ||
        t(`recurringExpenses.categories.${row.original.category}`).toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("recurringExpenses.title")}</h1>
      </Header>
      <Main>
        <KpiCards expenses={expenses} />
        <CategoryChart expenses={expenses} />

        <Card>
          <CardHeader>
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center justify-between")}>
              <CardTitle>{t("recurringExpenses.listTitle")}</CardTitle>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-between")}>
                <Input
                  placeholder={t("recurringExpenses.placeholders.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={isMobile ? "flex-1" : "w-64"}
                />
                <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
                  {!isMobile && t("recurringExpenses.actions.add")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("recurringExpenses.noResults")}</p>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <ExpenseMobileCard
                      key={row.id}
                      expense={row.original}
                      truck={getTruck(row.original.truckId)}
                      onEdit={() => { setEditing(row.original); setDialogOpen(true); }}
                      onDelete={() => setDeleteId(row.original.id)}
                      onMarkPaid={() => handleMarkPaid(row.original)}
                      t={t}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          {t("recurringExpenses.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        trucks={trucks}
        isMobile={isMobile}
        onSave={refresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recurringExpenses.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("recurringExpenses.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("recurringExpenses.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("recurringExpenses.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
