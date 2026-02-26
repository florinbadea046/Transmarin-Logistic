import * as React from "react";
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

export default function OrdersPage() {
  const [data, setData] = React.useState<Order[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

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

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Comenzi</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Gestiune Comenzi</CardTitle>
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
