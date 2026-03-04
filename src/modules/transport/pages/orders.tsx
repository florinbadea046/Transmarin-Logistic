import * as React from "react";
import { z } from "zod";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Order } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

const statusMeta: Record<
  Order["status"],
  {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "In asteptare", variant: "secondary" },
  assigned: { label: "Asignata", variant: "outline" },
  in_transit: { label: "In tranzit", variant: "default" },
  delivered: { label: "Livrata", variant: "secondary" },
  cancelled: { label: "Anulata", variant: "destructive" },
};

const statusFilterOptions = (Object.keys(statusMeta) as Order["status"][]).map(
  (value) => ({ value, label: statusMeta[value].label }),
);

const orderSchema = z.object({
  clientName: z.string().trim().min(1, "Clientul este obligatoriu"),
  origin: z.string().trim().min(1, "Originea este obligatorie"),
  destination: z.string().trim().min(1, "Destinatia este obligatorie"),
  date: z.date().refine((d) => d instanceof Date && !isNaN(d.getTime()), {
    message: "Data este obligatorie",
  }),
  weight: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine((n) => typeof n === "number" && Number.isFinite(n), {
      message: "Greutatea este obligatorie",
    })
    .refine((n) => n > 0, {
      message: "Greutatea trebuie sa fie > 0",
    }),
  notes: z.string().trim().optional(),
});

type OrderForm = z.infer<typeof orderSchema>;

function safeRandomId() {
  const c = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `order_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setOrdersToStorage(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  } catch (e) {
    void e;
  }
}

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isDuplicateOrder(
  existing: Order,
  incoming: {
    clientName: string;
    origin: string;
    destination: string;
    date: string;
    weight: number;
  },
  excludeId?: string,
) {
  if (excludeId && existing.id === excludeId) return false;
  const e = existing as any;
  return (
    norm(String(e.clientName ?? "")) === norm(incoming.clientName) &&
    norm(String(e.origin ?? "")) === norm(incoming.origin) &&
    norm(String(e.destination ?? "")) === norm(incoming.destination) &&
    String(e.date ?? "") === incoming.date &&
    round2(Number(e.weight ?? 0)) === round2(incoming.weight)
  );
}

const EMPTY_FORM: OrderForm = {
  clientName: "",
  origin: "",
  destination: "",
  date: new Date(),
  weight: 1,
  notes: "",
};

function DateButton({
  date,
  placeholder,
  onSelect,
}: {
  date: Date | undefined;
  placeholder: string;
  onSelect: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left text-sm font-normal sm:w-[150px]",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {date ? (
            <span className="tabular-nums">{format(date, "yyyy-MM-dd")}</span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface AdvancedFiltersProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  origin: string;
  destination: string;
  onDateFrom: (d: Date | undefined) => void;
  onDateTo: (d: Date | undefined) => void;
  onOrigin: (v: string) => void;
  onDestination: (v: string) => void;
  onReset: () => void;
  hasActive: boolean;
}

function AdvancedFilters({
  dateFrom,
  dateTo,
  origin,
  destination,
  onDateFrom,
  onDateTo,
  onOrigin,
  onDestination,
  onReset,
  hasActive,
}: AdvancedFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateButton
        date={dateFrom}
        placeholder="De la data"
        onSelect={onDateFrom}
      />
      <DateButton
        date={dateTo}
        placeholder="Pana la data"
        onSelect={onDateTo}
      />
      <Input
        value={origin}
        onChange={(e) => onOrigin(e.target.value)}
        placeholder="Origine..."
        className="h-8 w-full sm:w-[140px]"
      />
      <Input
        value={destination}
        onChange={(e) => onDestination(e.target.value)}
        placeholder="Destinatie..."
        className="h-8 w-full sm:w-[140px]"
      />
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={onReset}
        >
          Resetare filtre <X className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initialValues?: OrderForm;
  onSave: (values: OrderForm) => string | null;
  triggerButton?: React.ReactNode;
}

function OrderFormDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  onSave,
  triggerButton,
}: OrderFormDialogProps) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const [form, setForm] = React.useState<OrderForm>(
    initialValues ?? EMPTY_FORM,
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OrderForm, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initialValues ?? EMPTY_FORM);
      setErrors({});
      setFormError(null);
      setDateOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    setErrors({});
    setFormError(null);

    const parsed = orderSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof OrderForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof OrderForm | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    const err = onSave(parsed.data);
    if (err) {
      setFormError(err);
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDateOpen(false);
      }}
    >
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}

      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Formular pentru {title.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="clientName">Client *</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                placeholder="Ex: SC Transmarin SRL"
              />
              {errors.clientName ? (
                <p className="text-xs text-destructive">{errors.clientName}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="weight">Greutate (t) *</Label>
              <Input
                id="weight"
                inputMode="decimal"
                type="number"
                step="0.01"
                min={0}
                value={form.weight as any}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value as any }))
                }
                placeholder="Ex: 12.5"
              />
              {errors.weight ? (
                <p className="text-xs text-destructive">{errors.weight}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="origin">Origine *</Label>
              <Input
                id="origin"
                value={form.origin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, origin: e.target.value }))
                }
                placeholder="Ex: Brasov"
              />
              {errors.origin ? (
                <p className="text-xs text-destructive">{errors.origin}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="destination">Destinatie *</Label>
              <Input
                id="destination"
                value={form.destination}
                onChange={(e) =>
                  setForm((p) => ({ ...p, destination: e.target.value }))
                }
                placeholder="Ex: Constanta"
              />
              {errors.destination ? (
                <p className="text-xs text-destructive">{errors.destination}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Data *</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.date && "text-muted-foreground",
                    )}
                  >
                    {form.date ? (
                      <span className="tabular-nums">
                        {format(form.date, "yyyy-MM-dd")}
                      </span>
                    ) : (
                      "Selecteaza data"
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  side="bottom"
                  align="center"
                  avoidCollisions={false}
                  className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl w-[260px]"
                >
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={(d) => {
                      if (!d) return;
                      setForm((p) => ({ ...p, date: d }));
                      setDateOpen(false);
                    }}
                    initialFocus
                    fixedWeeks
                    style={{ ["--cell-size" as any]: "24px" }}
                    className="p-1 text-xs w-full"
                  />
                </PopoverContent>
              </Popover>
              {errors.date ? (
                <p className="text-xs text-destructive">{errors.date}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Detalii extra (optional)"
                className="min-h-[100px]"
              />
              {errors.notes ? (
                <p className="text-xs text-destructive">{errors.notes}</p>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuleaza
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Salveaza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const [data, setData] = React.useState<Order[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);

  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [filterOrigin, setFilterOrigin] = React.useState("");
  const [filterDestination, setFilterDestination] = React.useState("");

  React.useEffect(() => {
    setData(getCollection<Order>(STORAGE_KEYS.orders));
  }, []);

  const filteredData = React.useMemo(() => {
    return data.filter((o) => {
      if (dateFrom || dateTo) {
        const d = parseISO(o.date);
        if (dateFrom && d < startOfDay(dateFrom)) return false;
        if (dateTo && d > endOfDay(dateTo)) return false;
      }
      if (
        filterOrigin.trim() &&
        !o.origin.toLowerCase().includes(filterOrigin.trim().toLowerCase())
      )
        return false;
      if (
        filterDestination.trim() &&
        !o.destination
          .toLowerCase()
          .includes(filterDestination.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [data, dateFrom, dateTo, filterOrigin, filterDestination]);

  const hasAdvancedFilter = !!(
    dateFrom ||
    dateTo ||
    filterOrigin ||
    filterDestination
  );

  function resetAdvancedFilters() {
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterOrigin("");
    setFilterDestination("");
  }

  function handleAdd(values: OrderForm): string | null {
    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };

    if (data.some((o) => isDuplicateOrder(o, payload))) {
      return "Exista deja o comanda identica (aceleasi date).";
    }

    const newOrder = {
      id: safeRandomId(),
      ...payload,
      status: "pending",
      ...(values.notes ? { notes: values.notes } : {}),
    } as unknown as Order;

    const next = [newOrder, ...data];
    setData(next);
    setOrdersToStorage(next);
    return null;
  }

  function handleEdit(values: OrderForm): string | null {
    if (!editingOrder) return null;

    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };

    if (data.some((o) => isDuplicateOrder(o, payload, editingOrder.id))) {
      return "Exista deja o comanda identica (aceleasi date).";
    }

    const next = data.map((o) =>
      o.id === editingOrder.id
        ? { ...o, ...payload, notes: values.notes ?? "" }
        : o,
    );
    setData(next);
    setOrdersToStorage(next);
    setEditingOrder(null);
    return null;
  }

  function handleDelete() {
    if (!deletingOrder) return;
    const next = data.filter((o) => o.id !== deletingOrder.id);
    setData(next);
    setOrdersToStorage(next);
    setDeleteOpen(false);
    setDeletingOrder(null);
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setEditOpen(true);
  }

  function openDelete(order: Order) {
    setDeletingOrder(order);
    setDeleteOpen(true);
  }

  const editInitialValues: OrderForm | undefined = editingOrder
    ? {
        clientName: editingOrder.clientName,
        origin: editingOrder.origin,
        destination: editingOrder.destination,
        date: new Date(editingOrder.date),
        weight: editingOrder.weight ?? 1,
        notes: editingOrder.notes ?? "",
      }
    : undefined;

  const columns: ColumnDef<Order>[] = React.useMemo(
    () => [
      {
        accessorKey: "clientName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Client" />
        ),
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("clientName")}</div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "origin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Origine" />
        ),
        cell: ({ row }) => <div>{row.getValue("origin")}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "destination",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Destinatie" />
        ),
        cell: ({ row }) => <div>{row.getValue("destination")}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Data" />
        ),
        cell: ({ row }) => {
          const value = row.getValue("date") as string;
          return <div className="tabular-nums">{value}</div>;
        },
        enableSorting: true,
        size: 130,
        minSize: 120,
        maxSize: 150,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const value = row.getValue("status") as Order["status"];
          const meta = statusMeta[value];
          return (
            <Badge
              variant={meta.variant ?? "secondary"}
              className="whitespace-nowrap"
            >
              {meta.label}
            </Badge>
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => {
          const selected = value as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(row.getValue(id));
        },
        size: 140,
        minSize: 130,
        maxSize: 160,
      },
      {
        accessorKey: "weight",
        header: ({ column }) => (
          <div className="mx-auto w-fit text-xs">
            <DataTableColumnHeader column={column} title="Greutate (t)" />
          </div>
        ),
        cell: ({ row }) => {
          const value = row.getValue("weight") as number | undefined;
          return (
            <div className="text-xs tabular-nums text-center">
              {typeof value === "number" ? value : "—"}
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (a, b, id) => {
          const av = (a.getValue(id) as number | undefined) ?? -Infinity;
          const bv = (b.getValue(id) as number | undefined) ?? -Infinity;
          return av === bv ? 0 : av > bv ? 1 : -1;
        },
        size: 90,
        minSize: 80,
        maxSize: 110,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actiuni</span>,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label="Optiuni rand"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => openEdit(order)}
                  >
                    Editeaza
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => openDelete(order)}
                  >
                    Sterge
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 56,
        minSize: 48,
        maxSize: 64,
        enableSorting: false,
      },
    ],

    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    columnResizeMode: "onChange",
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Comenzi</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Gestiune Comenzi</CardTitle>

            <OrderFormDialog
              open={addOpen}
              onOpenChange={setAddOpen}
              title="Adauga comanda"
              onSave={handleAdd}
              triggerButton={<Button>Adauga comanda</Button>}
            />
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="Cauta comenzi..."
              searchKey="clientName"
              filters={[
                {
                  columnId: "status",
                  title: "Status",
                  options: statusFilterOptions,
                },
              ]}
            />

            <AdvancedFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              origin={filterOrigin}
              destination={filterDestination}
              onDateFrom={setDateFrom}
              onDateTo={setDateTo}
              onOrigin={setFilterOrigin}
              onDestination={setFilterDestination}
              onReset={resetAdvancedFilters}
              hasActive={hasAdvancedFilter}
            />

            <div className="rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className={
                            header.column.id === "weight"
                              ? "!text-center"
                              : undefined
                          }
                        >
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
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.getSize() }}
                            className={
                              cell.column.id === "weight"
                                ? "!text-center"
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nu exista comenzi pentru filtrul curent.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      <OrderFormDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingOrder(null);
        }}
        title="Editeaza comanda"
        initialValues={editInitialValues}
        onSave={handleEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeletingOrder(null);
        }}
        title="Sterge comanda"
        desc={
          deletingOrder ? (
            <span>
              Esti sigur ca vrei sa stergi comanda pentru{" "}
              <strong>{deletingOrder.clientName}</strong> (
              {deletingOrder.origin} &rarr; {deletingOrder.destination},{" "}
              {deletingOrder.date})? Aceasta actiune este ireversibila.
            </span>
          ) : (
            "Esti sigur ca vrei sa stergi aceasta comanda?"
          )
        }
        confirmText="Sterge"
        cancelBtnText="Anuleaza"
        destructive
        handleConfirm={handleDelete}
      />
    </>
  );
}
