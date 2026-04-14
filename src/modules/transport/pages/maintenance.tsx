// A35. Mentenanta Camioane
// Ruta: /transport/maintenance
// TanStack Table + CRUD complet cu Zod
// Badge-uri status colorate
// Alerta automata daca camion in_service > 7 zile
// Sumar costuri mentenanta/camion
// Responsive: useMobile(640)
// i18n: useTranslation, fara diacritice in cod

import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
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
  Plus, Pencil, Trash2, AlertTriangle, Wrench, DollarSign, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { Truck } from "@/modules/transport/types";
import type { MaintenanceRecord, MaintenanceType, MaintenanceStatus } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";
import { useAuditLog } from "@/hooks/use-audit-log";
import { cn } from "@/lib/utils";

// ── Zod schema ─────────────────────────────────────────────

function makeMaintenanceSchema(t: (k: string) => string) {
  return z.object({
    truckId: z.string().min(1),
    type: z.enum(["revizie", "schimb_ulei", "anvelope", "frane", "altele"]),
    description: z.string().min(3),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("maintenance.validation.invalidDate")),
    exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    cost: z.number({ message: t("maintenance.validation.invalidCost") }).min(0),
    mechanic: z.string().min(2),
    status: z.enum(["programat", "in_lucru", "finalizat"]),
    notes: z.string().optional(),
  });
}

type MaintenanceFormData = z.infer<ReturnType<typeof makeMaintenanceSchema>>;
type MaintenanceFormErrors = Partial<Record<keyof MaintenanceFormData, string>>;

const EMPTY_FORM: MaintenanceFormData = {
  truckId: "",
  type: "revizie",
  description: "",
  entryDate: "",
  exitDate: "",
  cost: 0,
  mechanic: "",
  status: "programat",
  notes: "",
};

// ── Status config ──────────────────────────────────────────

function statusClass(status: MaintenanceStatus): string {
  switch (status) {
    case "programat": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200";
    case "in_lucru": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200";
    case "finalizat": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200";
  }
}

// ── Alert 7+ zile in service ───────────────────────────────

function LongServiceAlert({ records, trucks }: {
  records: MaintenanceRecord[];
  trucks: Truck[];
}) {
  const { t } = useTranslation();
  const today = new Date();

  const alerts = records
    .filter((r) => r.status === "in_lucru" && !r.exitDate)
    .map((r) => {
      const days = differenceInDays(today, parseISO(r.entryDate));
      const truck = trucks.find((tr) => tr.id === r.truckId);
      return { record: r, days, truck };
    })
    .filter((a) => a.days > 7)
    .sort((a, b) => b.days - a.days);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-800 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          {t("maintenance.alerts.longService")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {alerts.map(({ record, days, truck }) => (
            <li key={record.id} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span className="font-medium">{truck?.plateNumber ?? record.truckId}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-red-600 dark:text-red-400">
                {t("maintenance.alerts.daysInService", { days })}
              </span>
              <span className="text-muted-foreground hidden sm:inline">
                ({t("maintenance.fields.mechanic")}: {record.mechanic})
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Sumar costuri ──────────────────────────────────────────

function CostSummary({ records, trucks }: {
  records: MaintenanceRecord[];
  trucks: Truck[];
}) {
  const { t } = useTranslation();

  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const finalizate = records.filter((r) => r.status === "finalizat").length;
  const inLucru = records.filter((r) => r.status === "in_lucru").length;

  const costPerTruck = trucks
    .map((truck) => ({
      truck,
      cost: records.filter((r) => r.truckId === truck.id).reduce((s, r) => s + r.cost, 0),
      count: records.filter((r) => r.truckId === truck.id).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.cost - a.cost);

  return (
    <div className="grid gap-4 mb-6 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("maintenance.kpi.totalCost")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCost.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("maintenance.kpi.allRecords")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("maintenance.kpi.completed")}</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{finalizate}</div>
          <p className="text-xs text-muted-foreground">{t("maintenance.kpi.completedDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("maintenance.kpi.inProgress")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", inLucru > 0 ? "text-yellow-600 dark:text-yellow-400" : "")}>{inLucru}</div>
          <p className="text-xs text-muted-foreground">{t("maintenance.kpi.inProgressDesc")}</p>
        </CardContent>
      </Card>

      {costPerTruck.length > 0 && (
        <Card className="sm:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("maintenance.kpi.costPerTruck")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {costPerTruck.map(({ truck, cost, count }) => (
                <div key={truck.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <span className="font-medium text-sm">{truck.plateNumber}</span>
                  <span className="text-xs text-muted-foreground">({count} {t("maintenance.kpi.interventions")})</span>
                  <span className="text-sm font-semibold">{cost.toLocaleString("ro-RO")} RON</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Dialog CRUD ────────────────────────────────────────────

function MaintenanceDialog({
  open, onOpenChange, editingRecord, trucks, isMobile, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRecord: MaintenanceRecord | null;
  trucks: Truck[];
  isMobile: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const maintenanceSchema = React.useMemo(() => makeMaintenanceSchema(t), [t]);
  const [form, setForm] = React.useState<MaintenanceFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<MaintenanceFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    if (editingRecord) {
      setForm({
        truckId: editingRecord.truckId,
        type: editingRecord.type,
        description: editingRecord.description,
        entryDate: editingRecord.entryDate,
        exitDate: editingRecord.exitDate ?? "",
        cost: editingRecord.cost,
        mechanic: editingRecord.mechanic,
        status: editingRecord.status,
        notes: editingRecord.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editingRecord]);

  const patch = (p: Partial<MaintenanceFormData>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = () => {
    const result = maintenanceSchema.safeParse(form);
    if (!result.success) {
      const errs: MaintenanceFormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof MaintenanceFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    const data = result.data;
    const truckLabel = trucks.find((tr) => tr.id === data.truckId)?.plateNumber ?? data.truckId;
    if (editingRecord) {
      updateItem<MaintenanceRecord>(
        STORAGE_KEYS.maintenance,
        (r) => r.id === editingRecord.id,
        (r) => ({ ...r, ...data, exitDate: data.exitDate || undefined }),
      );
      log({ action: "update", entity: "maintenance", entityId: editingRecord.id, entityLabel: truckLabel, detailKey: "activityLog.details.maintenanceUpdated", oldValue: { type: editingRecord.type, status: editingRecord.status, cost: editingRecord.cost }, newValue: { type: data.type, status: data.status, cost: data.cost } });
      toast.success(t("maintenance.toastUpdated"));
    } else {
      const newId = generateId();
      addItem<MaintenanceRecord>(STORAGE_KEYS.maintenance, {
        id: newId,
        ...data,
        exitDate: data.exitDate || undefined,
      });
      log({ action: "create", entity: "maintenance", entityId: newId, entityLabel: truckLabel, detailKey: "activityLog.details.maintenanceCreated", detailParams: { truck: truckLabel } });
      toast.success(t("maintenance.toastAdded"));
    }

    // Actualizeaza statusul camionului
    const truck = trucks.find((tr) => tr.id === data.truckId);
    if (truck) {
      if (data.status === "in_lucru" || data.status === "programat") {
        updateItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === data.truckId, (tr) => ({ ...tr, status: "in_service" }));
      } else if (data.status === "finalizat") {
        const otherActive = getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance)
          .filter((r) => r.truckId === data.truckId && r.id !== editingRecord?.id && (r.status === "in_lucru" || r.status === "programat"));
        if (otherActive.length === 0) {
          updateItem<Truck>(STORAGE_KEYS.trucks, (tr) => tr.id === data.truckId, (tr) => ({ ...tr, status: "available" }));
        }
      }
    }

    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex flex-col gap-4", isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{editingRecord ? t("maintenance.edit") : t("maintenance.add")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Camion */}
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("maintenance.fields.truck")}</Label>
            <Select value={form.truckId} onValueChange={(v) => patch({ truckId: v })}>
              <SelectTrigger><SelectValue placeholder={t("maintenance.placeholders.truck")} /></SelectTrigger>
              <SelectContent>
                {trucks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>{tr.plateNumber} — {tr.brand} {tr.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truckId && <p className="text-xs text-red-500">{t("maintenance.validation.truckRequired")}</p>}
          </div>

          {/* Tip */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.type")}</Label>
            <Select value={form.type} onValueChange={(v) => patch({ type: v as MaintenanceType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["revizie", "schimb_ulei", "anvelope", "frane", "altele"] as MaintenanceType[]).map((t_) => (
                  <SelectItem key={t_} value={t_}>{t(`maintenance.types.${t_}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.status")}</Label>
            <Select value={form.status} onValueChange={(v) => patch({ status: v as MaintenanceStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["programat", "in_lucru", "finalizat"] as MaintenanceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{t(`maintenance.status.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descriere */}
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("maintenance.fields.description")}</Label>
            <Input value={form.description} onChange={(e) => patch({ description: e.target.value })}
              placeholder={t("maintenance.placeholders.description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Data intrare */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.entryDate")}</Label>
            <Input type="date" value={form.entryDate} onChange={(e) => patch({ entryDate: e.target.value })} />
            {errors.entryDate && <p className="text-xs text-red-500">{errors.entryDate}</p>}
          </div>

          {/* Data iesire */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.exitDate")} ({t("maintenance.fields.optional")})</Label>
            <Input type="date" value={form.exitDate} onChange={(e) => patch({ exitDate: e.target.value })} />
          </div>

          {/* Cost */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.cost")}</Label>
            <Input type="number" min={0} value={form.cost}
              onChange={(e) => patch({ cost: parseFloat(e.target.value) || 0 })}
              placeholder="0" />
            {errors.cost && <p className="text-xs text-red-500">{errors.cost}</p>}
          </div>

          {/* Mecanic */}
          <div className="space-y-1">
            <Label>{t("maintenance.fields.mechanic")}</Label>
            <Input value={form.mechanic} onChange={(e) => patch({ mechanic: e.target.value })}
              placeholder={t("maintenance.placeholders.mechanic")} />
            {errors.mechanic && <p className="text-xs text-red-500">{errors.mechanic}</p>}
          </div>

          {/* Note */}
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("maintenance.fields.notes")} ({t("maintenance.fields.optional")})</Label>
            <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t("maintenance.placeholders.notes")} rows={2} />
          </div>
        </div>

        <DialogFooter className={cn(isMobile && "flex-col gap-2")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("maintenance.cancel")}
          </Button>
          <Button onClick={handleSubmit} className={cn(isMobile && "w-full")}>
            {editingRecord ? t("maintenance.save") : t("maintenance.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Mobile Card ────────────────────────────────────────────

function MaintenanceMobileCard({ record, truck, onEdit, onDelete, t }: {
  record: MaintenanceRecord;
  truck?: Truck;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{truck?.plateNumber ?? record.truckId}</p>
          <p className="text-xs text-muted-foreground">{t(`maintenance.types.${record.type}`)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={statusClass(record.status)}>
            {t(`maintenance.status.${record.status}`)}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">{record.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{t("maintenance.fields.entryDate")}: <span className="text-foreground">{record.entryDate}</span></span>
          {record.exitDate && <span>{t("maintenance.fields.exitDate")}: <span className="text-foreground">{record.exitDate}</span></span>}
          <span>{t("maintenance.fields.mechanic")}: <span className="text-foreground">{record.mechanic}</span></span>
          <span className="font-medium text-foreground">{record.cost.toLocaleString("ro-RO")} RON</span>
        </div>
      </div>
    </div>
  );
}

// ── Pagina ─────────────────────────────────────────────────

export default function MaintenancePage() {
  const { t } = useTranslation();
  const { log: auditLog } = useAuditLog();
  const isMobile = useMobile(640);

  const [records, setRecords] = React.useState<MaintenanceRecord[]>(() =>
    getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance),
  );
  const [trucks] = React.useState<Truck[]>(() => getCollection<Truck>(STORAGE_KEYS.trucks));

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<MaintenanceRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "entryDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const refreshRecords = () => setRecords(getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance));

  const handleDelete = () => {
    if (!deleteId) return;
    const record = records.find((r) => r.id === deleteId);
    const truckLabel = record ? (trucks.find((tr) => tr.id === record.truckId)?.plateNumber ?? record.truckId) : deleteId;
    removeItem<MaintenanceRecord>(STORAGE_KEYS.maintenance, (r) => r.id === deleteId);
    auditLog({ action: "delete", entity: "maintenance", entityId: deleteId, entityLabel: truckLabel, detailKey: "activityLog.details.maintenanceDeleted" });
    toast.success(t("maintenance.toastDeleted"));
    setDeleteId(null);
    refreshRecords();
  };

  const getTruck = React.useCallback((truckId: string) => trucks.find((tr) => tr.id === truckId), [trucks]);

  const columns: ColumnDef<MaintenanceRecord>[] = React.useMemo(() => [
    {
      accessorKey: "truckId",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.truck")} />,
      cell: ({ row }) => {
        const truck = getTruck(row.getValue("truckId"));
        return (
          <div>
            <div className="font-medium">{truck?.plateNumber ?? row.getValue("truckId")}</div>
            <div className="text-xs text-muted-foreground">{truck?.brand} {truck?.model}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.type")} />,
      cell: ({ row }) => <span>{t(`maintenance.types.${row.getValue("type")}`)}</span>,
    },
    {
      accessorKey: "description",
      header: t("maintenance.columns.description"),
      cell: ({ row }) => <div className="max-w-[200px] truncate text-sm text-muted-foreground">{row.getValue("description")}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "entryDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.entryDate")} />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.getValue("entryDate")}</span>,
    },
    {
      accessorKey: "exitDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.exitDate")} />,
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.getValue("exitDate") || "—"}</span>,
    },
    {
      accessorKey: "cost",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.cost")} />,
      cell: ({ row }) => <span className="font-medium whitespace-nowrap">{(row.getValue("cost") as number).toLocaleString("ro-RO")} RON</span>,
    },
    {
      accessorKey: "mechanic",
      header: t("maintenance.columns.mechanic"),
      cell: ({ row }) => <span className="whitespace-nowrap">{row.getValue("mechanic")}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("maintenance.columns.status")} />,
      cell: ({ row }) => {
        const s = row.getValue("status") as MaintenanceStatus;
        return <Badge variant="outline" className={statusClass(s)}>{t(`maintenance.status.${s}`)}</Badge>;
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditingRecord(row.original); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
      enableSorting: false,
    },
  ], [getTruck, t]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      if (!q) return true;
      const truck = getTruck(row.original.truckId);
      return (
        (truck?.plateNumber ?? "").toLowerCase().includes(q) ||
        row.original.description.toLowerCase().includes(q) ||
        row.original.mechanic.toLowerCase().includes(q)
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
        <h1 className="text-lg font-semibold">{t("maintenance.title")}</h1>
      </Header>
      <Main>
        <LongServiceAlert records={records} trucks={trucks} />
        <CostSummary records={records} trucks={trucks} />

        <Card>
          <CardHeader>
            <div className={cn("flex gap-2", isMobile ? "flex-col" : "items-center justify-between")}>
              <CardTitle>{t("maintenance.listTitle")}</CardTitle>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-between")}>
                <Input
                  placeholder={t("maintenance.placeholders.search")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); table.setPageIndex(0); }}
                  className={isMobile ? "flex-1" : "w-64"}
                />
                <Button size="sm" onClick={() => { setEditingRecord(null); setDialogOpen(true); }}>
                  <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
                  {!isMobile && t("maintenance.actions.add")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMobile ? (
              <div className="space-y-3">
                {table.getRowModel().rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">{t("maintenance.noResults")}</p>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <MaintenanceMobileCard
                      key={row.id}
                      record={row.original}
                      truck={getTruck(row.original.truckId)}
                      onEdit={() => { setEditingRecord(row.original); setDialogOpen(true); }}
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
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                          {t("maintenance.noResults")}
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

      <MaintenanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRecord={editingRecord}
        trucks={trucks}
        isMobile={isMobile}
        onSave={refreshRecords}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("maintenance.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("maintenance.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("maintenance.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("maintenance.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}