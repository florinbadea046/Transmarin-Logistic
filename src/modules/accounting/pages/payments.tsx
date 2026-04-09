// B8. Registru Plăți
// Ruta: /accounting/payments
// TanStack Table: nr factura (link), furnizor/client, suma, data, metoda, referinta, status
// CRUD cu Zod
// KPI cards: total plati luna, sold restant clienti, sold restant furnizori
// Persistare STORAGE_KEYS.payments
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
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Plus, Pencil, Trash2, DollarSign, TrendingDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { DataTablePagination } from "@/components/data-table/pagination";

import { getCollection, addItem, updateItem, removeItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Payment, PaymentMethod, PaymentStatus } from "@/modules/accounting/types";
import { useMobile } from "@/hooks/use-mobile";
import { useAuditLog } from "@/hooks/use-audit-log";
import { cn } from "@/lib/utils";

// ── Zod schema ───────────────────────────────────────────────

const paymentSchema = z.object({
  invoiceNumber: z.string().min(1, "Nr factura obligatoriu"),
  clientName: z.string().min(2, "Numele obligatoriu"),
  direction: z.enum(["income", "expense"]),
  amount: z.number({ message: "Suma invalida" }).positive("Suma trebuie sa fie pozitiva"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  method: z.enum(["transfer", "cash", "card", "CEC"]),
  bankRef: z.string().optional(),
  status: z.enum(["confirmata", "in_asteptare"]),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;
type PaymentFormErrors = Partial<Record<keyof PaymentFormData, string>>;

const EMPTY_FORM: PaymentFormData = {
  invoiceNumber: "",
  clientName: "",
  direction: "income",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  method: "transfer",
  bankRef: "",
  status: "in_asteptare",
  notes: "",
};

const PAYMENT_METHODS: PaymentMethod[] = ["transfer", "cash", "card", "CEC"];

// ── Seed data ────────────────────────────────────────────────

const seedPayments: Payment[] = [
  {
    id: "pay-1",
    invoiceNumber: "FACT-2024-001",
    clientName: "SC Logistica SRL",
    direction: "income",
    amount: 5950,
    date: new Date().toISOString().slice(0, 10),
    method: "transfer",
    bankRef: "REF-001-2024",
    status: "confirmata",
    createdAt: new Date().toISOString(),
  },
  {
    id: "pay-2",
    invoiceNumber: "CHELT-2024-002",
    clientName: "Auto Parts SRL",
    direction: "expense",
    amount: 2856,
    date: new Date().toISOString().slice(0, 10),
    method: "card",
    bankRef: "",
    status: "in_asteptare",
    createdAt: new Date().toISOString(),
  },
];

// ── KPI Cards ────────────────────────────────────────────────

function PaymentKpiCards({ payments }: { payments: Payment[] }) {
  const { t } = useTranslation();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalLuna = payments
    .filter((p) => p.date.startsWith(thisMonth) && p.status === "confirmata")
    .reduce((s, p) => s + p.amount, 0);

  const soldRestantClienti = payments
    .filter((p) => p.direction === "income" && p.status === "in_asteptare")
    .reduce((s, p) => s + p.amount, 0);

  const soldRestantFurnizori = payments
    .filter((p) => p.direction === "expense" && p.status === "in_asteptare")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="grid gap-4 mb-6 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("payments.kpi.totalLuna")}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLuna.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("payments.kpi.totalLunaDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("payments.kpi.soldClienti")}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {soldRestantClienti.toLocaleString("ro-RO")} RON
          </div>
          <p className="text-xs text-muted-foreground">{t("payments.kpi.soldClientiDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("payments.kpi.soldFurnizori")}
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {soldRestantFurnizori.toLocaleString("ro-RO")} RON
          </div>
          <p className="text-xs text-muted-foreground">{t("payments.kpi.soldFurnizoriDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status, t }: { status: PaymentStatus; t: (k: string) => string }) {
  return (
    <Badge variant="outline" className={cn(
      "text-xs",
      status === "confirmata"
        ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    )}>
      {t(`payments.status.${status}`)}
    </Badge>
  );
}

// ── Dialog Form ──────────────────────────────────────────────

function PaymentDialog({
  open, onOpenChange, editing, onSave, isMobile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Payment | null;
  onSave: () => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const [form, setForm] = React.useState<PaymentFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<PaymentFormErrors>({});

  React.useEffect(() => {
    if (open) {
      setErrors({});
      setForm(editing ? {
        invoiceNumber: editing.invoiceNumber,
        clientName: editing.clientName,
        direction: editing.direction,
        amount: editing.amount,
        date: editing.date,
        method: editing.method,
        bankRef: editing.bankRef ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
      } : EMPTY_FORM);
    }
  }, [open, editing]);

  const set = (field: keyof PaymentFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const result = paymentSchema.safeParse(form);
    if (!result.success) {
      const errs: PaymentFormErrors = {};
      result.error.errors.forEach((e) => {
        const key = e.path[0] as keyof PaymentFormData;
        errs[key] = e.message;
      });
      setErrors(errs);
      return;
    }

    if (editing) {
      updateItem<Payment>(
        STORAGE_KEYS.payments,
        (p) => p.id === editing.id,
        (p) => ({ ...p, ...result.data }),
      );
      log({ action: "update", entity: "invoice", entityId: editing.id, entityLabel: `Plata ${form.invoiceNumber}` });
      toast.success(t("payments.toastUpdated"));
    } else {
      const newPayment: Payment = {
        ...result.data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      addItem<Payment>(STORAGE_KEYS.payments, newPayment);
      log({ action: "create", entity: "invoice", entityId: newPayment.id, entityLabel: `Plata ${form.invoiceNumber}` });
      toast.success(t("payments.toastAdded"));
    }

    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? "max-w-full mx-2" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("payments.dialog.editTitle") : t("payments.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("payments.columns.invoiceNumber")}</Label>
              <Input value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
              {errors.invoiceNumber && <p className="text-xs text-red-500">{errors.invoiceNumber}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("payments.columns.direction")}</Label>
              <Select value={form.direction} onValueChange={(v) => set("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t("payments.direction.income")}</SelectItem>
                  <SelectItem value="expense">{t("payments.direction.expense")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("payments.columns.clientName")}</Label>
            <Input value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
            {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("payments.columns.amount")} (RON)</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("payments.columns.date")}</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("payments.columns.method")}</Label>
              <Select value={form.method} onValueChange={(v) => set("method", v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{t(`payments.method.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("payments.columns.status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as PaymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmata">{t("payments.status.confirmata")}</SelectItem>
                  <SelectItem value="in_asteptare">{t("payments.status.in_asteptare")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("payments.columns.bankRef")}</Label>
            <Input value={form.bankRef} onChange={(e) => set("bankRef", e.target.value)} placeholder="REF-..." />
          </div>

          <div className="space-y-1">
            <Label>{t("payments.columns.notes")}</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            {t("payments.cancel")}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSave}>
            {editing ? t("payments.actions.save") : t("payments.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mobile Card ──────────────────────────────────────────────

function PaymentMobileCard({
  payment, onEdit, onDelete, t,
}: {
  payment: Payment;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{payment.invoiceNumber}</span>
        <StatusBadge status={payment.status} t={t} />
      </div>
      <div className="text-sm text-muted-foreground">{payment.clientName}</div>
      <div className="flex items-center justify-between">
        <span className={cn("font-bold text-sm", payment.direction === "income" ? "text-green-600" : "text-red-600")}>
          {payment.direction === "income" ? "+" : "-"}{payment.amount.toLocaleString("ro-RO")} RON
        </span>
        <span className="text-xs text-muted-foreground">{payment.date}</span>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{t(`payments.method.${payment.method}`)}</Badge>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Pagina principala ────────────────────────────────────────

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const isMobile = useMobile(640);

  const [payments, setPayments] = React.useState<Payment[]>(() => {
    const existing = getCollection<Payment>(STORAGE_KEYS.payments);
    if (existing.length === 0) {
      seedPayments.forEach((p) => addItem<Payment>(STORAGE_KEYS.payments, p));
      return seedPayments;
    }
    return existing;
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Payment | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);

  const refresh = React.useCallback(() =>
    setPayments(getCollection<Payment>(STORAGE_KEYS.payments)), []);

  const handleDelete = () => {
    if (!deleteId) return;
    const payment = payments.find((p) => p.id === deleteId);
    removeItem<Payment>(STORAGE_KEYS.payments, (p) => p.id === deleteId);
    log({
      action: "delete", entity: "invoice", entityId: deleteId,
      entityLabel: payment ? `Plata ${payment.invoiceNumber}` : deleteId,
    });
    toast.success(t("payments.toastDeleted"));
    setDeleteId(null);
    refresh();
  };

  const columns: ColumnDef<Payment>[] = React.useMemo(() => [
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.invoiceNumber")} />,
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue("invoiceNumber")}</span>
      ),
    },
    {
      accessorKey: "clientName",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.clientName")} />,
      cell: ({ row }) => <span>{row.getValue("clientName")}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.amount")} />,
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <span className={cn("font-bold whitespace-nowrap",
            payment.direction === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {payment.direction === "income" ? "+" : "-"}
            {(row.getValue("amount") as number).toLocaleString("ro-RO")} RON
          </span>
        );
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.date")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.getValue("date")}</span>,
    },
    {
      accessorKey: "method",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.method")} />,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {t(`payments.method.${row.getValue("method")}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "bankRef",
      header: t("payments.columns.bankRef"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("bankRef") || "—"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("payments.columns.status")} />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} t={t} />,
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setDialogOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}
            className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [t]);

  const table = useReactTable({
    data: payments,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      if (!q) return true;
      return (
        row.original.invoiceNumber.toLowerCase().includes(q) ||
        row.original.clientName.toLowerCase().includes(q) ||
        row.original.bankRef?.toLowerCase().includes(q) ||
        false
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("payments.title")}</h1>
      </Header>
      <Main>
        <PaymentKpiCards payments={payments} />

        <Card>
          <CardHeader>
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center justify-between")}>
              <CardTitle>{t("payments.listTitle")}</CardTitle>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-between")}>
                <Input
                  placeholder={t("payments.placeholders.search")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); table.setPageIndex(0); }}
                  className={isMobile ? "flex-1" : "w-64"}
                />
                <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
                  {!isMobile && t("payments.actions.add")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("payments.noResults")}</p>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <PaymentMobileCard
                      key={row.id}
                      payment={row.original}
                      onEdit={() => { setEditing(row.original); setDialogOpen(true); }}
                      onDelete={() => setDeleteId(row.original.id)}
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
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          {t("payments.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={refresh}
        isMobile={isMobile}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payments.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("payments.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("payments.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("payments.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
