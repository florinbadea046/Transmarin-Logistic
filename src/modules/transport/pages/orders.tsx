import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  pending: { label: "În așteptare", variant: "secondary" },
  assigned: { label: "Asignată", variant: "outline" },
  in_transit: { label: "În tranzit", variant: "default" },
  delivered: { label: "Livrată", variant: "secondary" },
  cancelled: { label: "Anulată", variant: "destructive" },
};

const statusFilterOptions = (Object.keys(statusMeta) as Order["status"][]).map(
  (value) => ({ value, label: statusMeta[value].label }),
);

const columns: ColumnDef<Order>[] = [
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
      <DataTableColumnHeader column={column} title="Destinație" />
    ),
    cell: ({ row }) => <div>{row.getValue("destination")}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dată" />
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
        <div className="text-xs tabular-nums">
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
];

const orderSchema = z.object({
  clientName: z.string().trim().min(1, "Clientul este obligatoriu"),
  origin: z.string().trim().min(1, "Originea este obligatorie"),
  destination: z.string().trim().min(1, "Destinația este obligatorie"),
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
      message: "Greutatea trebuie să fie > 0",
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
  } catch {
    return;
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
) {
  const e = existing as any;
  return (
    norm(String(e.clientName ?? "")) === norm(incoming.clientName) &&
    norm(String(e.origin ?? "")) === norm(incoming.origin) &&
    norm(String(e.destination ?? "")) === norm(incoming.destination) &&
    String(e.date ?? "") === incoming.date &&
    round2(Number(e.weight ?? 0)) === round2(incoming.weight)
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

  const [open, setOpen] = React.useState(false);
  const [dateOpen, setDateOpen] = React.useState(false);
  const [form, setForm] = React.useState<OrderForm>({
    clientName: "",
    origin: "",
    destination: "",
    date: new Date(),
    weight: 1,
    notes: "",
  });
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OrderForm, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const orders = getCollection<Order>(STORAGE_KEYS.orders);
    setData(orders);
  }, []);

  const table = useReactTable({
    data,
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

  const resetForm = React.useCallback(() => {
    setForm({
      clientName: "",
      origin: "",
      destination: "",
      date: new Date(),
      weight: 1,
      notes: "",
    });
    setErrors({});
    setFormError(null);
  }, []);

  function onSubmit() {
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

    const values = parsed.data;

    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: format(values.date, "yyyy-MM-dd"),
      weight: values.weight,
    };

    if (data.some((o) => isDuplicateOrder(o, payload))) {
      setFormError("Există deja o comandă identică (aceleași date).");
      return;
    }

    const newOrder = {
      id: safeRandomId(),
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: payload.date,
      weight: values.weight,
      status: "pending",
      ...(values.notes ? { notes: values.notes } : {}),
    } as unknown as Order;

    const next = [newOrder, ...data];
    setData(next);
    setOrdersToStorage(next);

    setOpen(false);
    resetForm();
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Comenzi</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Gestiune Comenzi</CardTitle>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);

                if (!v) {
                  resetForm();
                  setDateOpen(false);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>Adaugă comandă</Button>
              </DialogTrigger>

              <DialogContent className="max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>Adaugă comandă</DialogTitle>
                  <DialogDescription className="sr-only">
                    Formular pentru adăugarea unei comenzi noi.
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
                          setForm((p) => ({
                            ...p,
                            clientName: e.target.value,
                          }))
                        }
                        placeholder="Ex: SC Transmarin SRL"
                      />
                      {errors.clientName ? (
                        <p className="text-xs text-destructive">
                          {errors.clientName}
                        </p>
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
                          setForm((p) => ({
                            ...p,
                            weight: e.target.value as any,
                          }))
                        }
                        placeholder="Ex: 12.5"
                      />
                      {errors.weight ? (
                        <p className="text-xs text-destructive">
                          {errors.weight}
                        </p>
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
                        placeholder="Ex: Brașov"
                      />
                      {errors.origin ? (
                        <p className="text-xs text-destructive">
                          {errors.origin}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="destination">Destinație *</Label>
                      <Input
                        id="destination"
                        value={form.destination}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            destination: e.target.value,
                          }))
                        }
                        placeholder="Ex: Constanța"
                      />
                      {errors.destination ? (
                        <p className="text-xs text-destructive">
                          {errors.destination}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Dată *</Label>
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
                              "Selectează data"
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
                        <p className="text-xs text-destructive">
                          {errors.date}
                        </p>
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
                        placeholder="Detalii extra (opțional)"
                        className="min-h-[100px]"
                      />
                      {errors.notes ? (
                        <p className="text-xs text-destructive">
                          {errors.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Anulează
                  </Button>
                  <Button type="button" onClick={onSubmit}>
                    Salvează
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="Caută comenzi..."
              searchKey="clientName"
              filters={[
                {
                  columnId: "status",
                  title: "Status",
                  options: statusFilterOptions,
                },
              ]}
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
                        Nu există comenzi pentru filtrul curent.
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
    </>
  );
}
