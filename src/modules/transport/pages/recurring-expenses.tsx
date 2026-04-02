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
import { z } from "zod";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Plus, Pencil, Trash2, CheckCircle2, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

import { getCollection, addItem, updateItem, removeItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ── Tipuri ─────────────────────────────────────────────────

export type RecurringCategory =
  | "asigurare"
  | "leasing"
  | "taxe"
  | "parcare"
  | "altele";

export type RecurringStatus = "platit" | "neplatit";

export interface RecurringExpense {
  id: string;
  category: RecurringCategory;
  truckId: string;
  description: string;
  monthlyAmount: number;
  nextPaymentDate: string;  // yyyy-MM-dd
  status: RecurringStatus;
  notes?: string;
}

// ── Zod schema ─────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.enum(["asigurare", "leasing", "taxe", "parcare", "altele"]),
  truckId: z.string().min(1),
  description: z.string().min(2),
  monthlyAmount: z.number({ message: "Suma invalida" }).positive(),
  nextPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  status: z.enum(["platit", "neplatit"]),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;
type ExpenseFormErrors = Partial<Record<keyof ExpenseFormData, string>>;

const EMPTY_FORM: ExpenseFormData = {
  category: "asigurare",
  truckId: "",
  description: "",
  monthlyAmount: 0,
  nextPaymentDate: "",
  status: "neplatit",
  notes: "",
};

// ── Culori PieChart ────────────────────────────────────────

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ── Status Badge ───────────────────────────────────────────

function StatusBadge({ status, t }: { status: RecurringStatus; t: (k: string) => string }) {
  return (
    <Badge variant="outline" className={cn(
      "whitespace-nowrap",
      status === "platit"
        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
    )}>
      {t(`recurringExpenses.status.${status}`)}
    </Badge>
  );
}

// ── KPI Cards ──────────────────────────────────────────────

function KpiCards({ expenses }: { expenses: RecurringExpense[] }) {
  const { t } = useTranslation();

  const totalLuna = expenses.reduce((s, e) => s + e.monthlyAmount, 0);
  const platit = expenses.filter((e) => e.status === "platit").reduce((s, e) => s + e.monthlyAmount, 0);
  const restant = expenses.filter((e) => e.status === "neplatit").reduce((s, e) => s + e.monthlyAmount, 0);

  return (
    <div className="grid gap-4 mb-6 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.totalMonth")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLuna.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.totalMonthDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.paid")}</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{platit.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.paidDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.unpaid")}</CardTitle>
          <AlertTriangle className={cn("h-4 w-4", restant > 0 ? "text-red-500" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", restant > 0 ? "text-red-600 dark:text-red-400" : "")}>
            {restant.toLocaleString("ro-RO")} RON
          </div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.unpaidDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── PieChart distributie ───────────────────────────────────

function CategoryChart({ expenses }: { expenses: RecurringExpense[] }) {
  const { t } = useTranslation();
  if (expenses.length === 0) return null;

  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.monthlyAmount;
  }
  const data = Object.entries(catMap).map(([cat, value]) => ({
    name: t(`recurringExpenses.categories.${cat}`),
    value,
  }));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("recurringExpenses.chart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(val) => [`${Number(val).toLocaleString("ro-RO")} RON`]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Dialog CRUD ────────────────────────────────────────────

function ExpenseDialog({
  open, onOpenChange, editing, trucks, isMobile, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RecurringExpense | null;
  trucks: Truck[];
  isMobile: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<ExpenseFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<ExpenseFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        category: editing.category,
        truckId: editing.truckId,
        description: editing.description,
        monthlyAmount: editing.monthlyAmount,
        nextPaymentDate: editing.nextPaymentDate,
        status: editing.status,
        notes: editing.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editing]);

  const patch = (p: Partial<ExpenseFormData>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = () => {
    const result = expenseSchema.safeParse(form);
    if (!result.success) {
      const errs: ExpenseFormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ExpenseFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    const data = result.data;
    if (editing) {
      updateItem<RecurringExpense>(
        STORAGE_KEYS.recurringExpenses,
        (e) => e.id === editing.id,
        (e) => ({ ...e, ...data }),
      );
      toast.success(t("recurringExpenses.toastUpdated"));
    } else {
      addItem<RecurringExpense>(STORAGE_KEYS.recurringExpenses, {
        id: generateId(), ...data,
      });
      toast.success(t("recurringExpenses.toastAdded"));
    }
    onSave();
    onOpenChange(false);
  };

  const categories: RecurringCategory[] = ["asigurare", "leasing", "taxe", "parcare", "altele"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex flex-col gap-4", isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-xl")}>
        <DialogHeader>
          <DialogTitle>{editing ? t("recurringExpenses.edit") : t("recurringExpenses.add")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Categorie */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.category")}</Label>
            <Select value={form.category} onValueChange={(v) => patch({ category: v as RecurringCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{t(`recurringExpenses.categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camion */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.truck")}</Label>
            <Select value={form.truckId} onValueChange={(v) => patch({ truckId: v })}>
              <SelectTrigger><SelectValue placeholder={t("recurringExpenses.placeholders.truck")} /></SelectTrigger>
              <SelectContent>
                {trucks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>{tr.plateNumber} — {tr.brand} {tr.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truckId && <p className="text-xs text-red-500">{t("recurringExpenses.validation.truckRequired")}</p>}
          </div>

          {/* Descriere */}
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("recurringExpenses.fields.description")}</Label>
            <Input value={form.description} onChange={(e) => patch({ description: e.target.value })}
              placeholder={t("recurringExpenses.placeholders.description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Suma lunara */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.monthlyAmount")}</Label>
            <Input type="number" min={0} value={form.monthlyAmount}
              onChange={(e) => patch({ monthlyAmount: parseFloat(e.target.value) || 0 })} />
            {errors.monthlyAmount && <p className="text-xs text-red-500">{errors.monthlyAmount}</p>}
          </div>

          {/* Data urmatoare plata */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.nextPaymentDate")}</Label>
            <Input type="date" value={form.nextPaymentDate}
              onChange={(e) => patch({ nextPaymentDate: e.target.value })} />
            {errors.nextPaymentDate && <p className="text-xs text-red-500">{errors.nextPaymentDate}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.status")}</Label>
            <Select value={form.status} onValueChange={(v) => patch({ status: v as RecurringStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="neplatit">{t("recurringExpenses.status.neplatit")}</SelectItem>
                <SelectItem value="platit">{t("recurringExpenses.status.platit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.notes")} ({t("recurringExpenses.fields.optional")})</Label>
            <Input value={form.notes} onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t("recurringExpenses.placeholders.notes")} />
          </div>
        </div>

        <DialogFooter className={cn(isMobile && "flex-col gap-2")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("recurringExpenses.cancel")}
          </Button>
          <Button onClick={handleSubmit} className={cn(isMobile && "w-full")}>
            {editing ? t("recurringExpenses.save") : t("recurringExpenses.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mobile Card ────────────────────────────────────────────

function ExpenseMobileCard({ expense, truck, onEdit, onDelete, onMarkPaid, t }: {
  expense: RecurringExpense;
  truck?: Truck;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{t(`recurringExpenses.categories.${expense.category}`)}</p>
          <p className="text-xs text-muted-foreground">{truck?.plateNumber ?? expense.truckId}</p>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge status={expense.status} t={t} />
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="text-foreground font-medium">{expense.monthlyAmount.toLocaleString("ro-RO")} RON</span>
        <span>{t("recurringExpenses.fields.nextPaymentDate")}: <span className="text-foreground">{expense.nextPaymentDate}</span></span>
        <span className="truncate">{expense.description}</span>
      </div>
      {expense.status === "neplatit" && (
        <Button size="sm" variant="outline" onClick={onMarkPaid} className="w-full mt-1 border-green-500 text-green-700 dark:text-green-400 hover:bg-green-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
          {t("recurringExpenses.actions.markPaid")}
        </Button>
      )}
    </div>
  );
}

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

  const refresh = () => setExpenses(getCollection<RecurringExpense>(STORAGE_KEYS.recurringExpenses));

  const getTruck = (id: string) => trucks.find((tr) => tr.id === id);

  const handleMarkPaid = (expense: RecurringExpense) => {
    updateItem<RecurringExpense>(
      STORAGE_KEYS.recurringExpenses,
      (e) => e.id === expense.id,
      (e) => ({ ...e, status: "platit" }),
    );
    toast.success(t("recurringExpenses.toastMarkPaid"));
    refresh();
  };

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
  ], [trucks, t, expenses]);

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