import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { Order } from "@/modules/transport/types";
import type { StatusMeta } from "./order-utils";

export interface OrderColumnActions {
  openDetail: (order: Order) => void;
  openEdit: (order: Order) => void;
  openDelete: (order: Order) => void;
}

export function getOrderColumns(
  t: (k: string) => string,
  statusMeta: StatusMeta,
  actions: OrderColumnActions,
): ColumnDef<Order>[] {
  return [
    {
      accessorKey: "clientName",
      meta: { label: t("orders.fields.client") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.client")}
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("clientName")}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "origin",
      meta: { label: t("orders.fields.origin") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.origin")}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("origin")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "destination",
      meta: { label: t("orders.fields.destination") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.destination")}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("destination")}</div>,
      enableSorting: true,
    },
    {
      id: "stops",
      meta: { label: t("orders.fields.stops") },
      header: () => (
        <span className="text-xs font-medium">{t("orders.fields.stops")}</span>
      ),
      cell: ({ row }) => {
        const stops = row.original.stops;
        if (!stops || stops.length === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {stops.length}
          </Badge>
        );
      },
      enableSorting: false,
      size: 80,
      minSize: 70,
      maxSize: 90,
    },
    {
      accessorKey: "date",
      meta: { label: t("orders.fields.date") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.date")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums">{row.getValue("date") as string}</div>
      ),
      enableSorting: true,
      size: 130,
      minSize: 120,
      maxSize: 150,
    },
    {
      accessorKey: "status",
      meta: { label: t("orders.fields.status") },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("orders.fields.status")}
        />
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
      meta: { label: t("orders.fields.weight") },
      header: ({ column }) => (
        <div className="mx-auto w-fit text-xs">
          <DataTableColumnHeader
            column={column}
            title={t("orders.fields.weight")}
          />
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
      header: () => (
        <span className="sr-only">{t("orders.actions.actions")}</span>
      ),
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
                  aria-label={t("orders.actions.rowOptions")}
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
                  onClick={() => actions.openDetail(order)}
                >
                  {t("orders.actions.details")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => actions.openEdit(order)}
                >
                  {t("orders.actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => actions.openDelete(order)}
                >
                  {t("orders.actions.delete")}
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
  ];
}
