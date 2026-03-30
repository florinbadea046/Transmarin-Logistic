import type { ColumnDef } from "@tanstack/react-table";
import {
  Play,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  MapPin,
  FileText,
} from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import { StatusBadge } from "./trips-status-badge";

export interface BuildColumnsParams {
  orders: Order[];
  drivers: Driver[];
  trucks: Truck[];
  allTrips: Trip[];
  onStatusChange: (trip: Trip) => void;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onGenerateInvoice: (trip: Trip) => void;
  t: (k: string) => string;
  navigate: (opts: { to: string; params?: Record<string, string> }) => void;
}

export function buildColumns({
  orders,
  drivers,
  trucks,
  allTrips,
  onStatusChange,
  onEdit,
  onDelete,
  onGenerateInvoice,
  t,
  navigate,
}: BuildColumnsParams): ColumnDef<Trip>[] {
  return [
    {
      id: "nr",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trips.columns.nr")} />
      ),
      cell: ({ row }) => {
        const idx = allTrips.findIndex((trip) => trip.id === row.original.id);
        return (
          <div className="tabular-nums text-muted-foreground text-sm">
            {idx + 1}
          </div>
        );
      },
      enableSorting: false,
      size: 50,
    },
    {
      accessorKey: "orderId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.order")}
        />
      ),
      cell: ({ row }) => {
        const order = orders.find((o) => o.id === row.getValue("orderId"));
        return (
          <div className="font-medium text-sm">
            {order ? (
              <span className="text-primary underline-offset-4 hover:underline cursor-default">
                {order.clientName}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {row.getValue("orderId")}
              </span>
            )}
          </div>
        );
      },
      filterFn: (row, _id, filterValue: string) => {
        if (!filterValue) return true;
        const order = orders.find((o) => o.id === row.getValue("orderId"));
        const search = filterValue.toLowerCase();
        return (
          (order?.clientName?.toLowerCase().includes(search) ?? false) ||
          (row.getValue("orderId") as string).toLowerCase().includes(search)
        );
      },
      enableSorting: false,
    },
    {
      id: "route",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.route")}
        />
      ),
      cell: ({ row }) => {
        const order = orders.find((o) => o.id === row.original.orderId);
        if (!order)
          return <div className="text-muted-foreground text-xs">—</div>;
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {order.origin} → {order.destination}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "driverId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.driver")}
        />
      ),
      cell: ({ row }) => {
        const driver = drivers.find((d) => d.id === row.getValue("driverId"));
        return (
          <div className="text-sm">
            {driver?.name ?? row.getValue("driverId")}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "truckId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.truck")}
        />
      ),
      cell: ({ row }) => {
        const truck = trucks.find((tr) => tr.id === row.getValue("truckId"));
        return (
          <div className="text-sm whitespace-nowrap">
            {truck
              ? `${truck.plateNumber} · ${truck.brand} ${truck.model}`
              : row.getValue("truckId")}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.status")}
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as Trip["status"];
        return (
          <StatusBadge status={status} label={t(`trips.status.${status}`)} />
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        if (!selected || selected.length === 0) return true;
        return selected.includes(row.getValue(id));
      },
      size: 150,
    },
    {
      accessorKey: "departureDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.departureDate")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-sm">
          {row.getValue("departureDate")}
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: "estimatedArrivalDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.arrivalDate")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-sm">
          {row.getValue("estimatedArrivalDate")}
        </div>
      ),
      enableSorting: true,
      size: 130,
    },
    {
      accessorKey: "kmLoaded",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.kmLoaded")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("kmLoaded") as number).toLocaleString()} km
        </div>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      accessorKey: "kmEmpty",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.kmEmpty")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("kmEmpty") as number).toLocaleString()} km
        </div>
      ),
      enableSorting: true,
      size: 100,
    },
    {
      accessorKey: "fuelCost",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.fuelCost")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {(row.getValue("fuelCost") as number).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 140,
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("trips.columns.revenue")}
        />
      ),
      cell: ({ row }) => (
        <div className="tabular-nums text-right text-sm">
          {((row.getValue("revenue") as number) ?? 0).toLocaleString()} RON
        </div>
      ),
      enableSorting: true,
      size: 140,
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center text-xs text-muted-foreground">
          {t("trips.columns.actions")}
        </div>
      ),
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-center items-center gap-1">
            <button
              title={t("trips.actions.edit")}
              onClick={() => onEdit(trip)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-border/50 bg-transparent hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              title={
                trip.status === "in_desfasurare"
                  ? t("trips.delete.disabledTooltip")
                  : t("trips.actions.delete")
              }
              onClick={() => trip.status !== "in_desfasurare" && onDelete(trip)}
              disabled={trip.status === "in_desfasurare"}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-red-200 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </button>
            {trip.status === "planned" && (
              <>
                <button
                  title={t("trips.actions.start")}
                  onClick={() =>
                    onStatusChange({ ...trip, status: "in_desfasurare" })
                  }
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-green-300 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Play className="h-3 w-3 text-green-600" />
                </button>
                <button
                  title={t("trips.actions.cancel")}
                  onClick={() => onStatusChange({ ...trip, status: "anulata" })}
                  className="h-6 w-6 flex items-center justify-center rounded-md border border-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <XCircle className="h-3 w-3 text-red-500" />
                </button>
              </>
            )}
            {trip.status === "in_desfasurare" && (
              <button
                title={t("trips.actions.finish")}
                onClick={() =>
                  onStatusChange({ ...trip, status: "finalizata" })
                }
                className="h-6 w-6 flex items-center justify-center rounded-md border border-green-400 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <CheckCircle className="h-3 w-3 text-green-600" />
              </button>
            )}
            {trip.status === "in_desfasurare" && (
              <button
                title={t("trips.actions.liveTrack")}
                onClick={() =>
                  navigate({
                    to: "/transport/trip-tracker/$tripId",
                    params: { tripId: trip.id },
                  })
                }
                className="h-6 w-6 flex items-center justify-center rounded-md border border-amber-300 bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <MapPin className="h-3 w-3 text-amber-500" />
              </button>
            )}
            {trip.status === "finalizata" && (
              <button
                title={t("trips.actions.generateInvoice")}
                onClick={() => {
                  onGenerateInvoice(trip);
                }}
                className="h-6 w-6 flex items-center justify-center rounded-md border border-violet-300 bg-transparent hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                <FileText className="h-3 w-3 text-violet-500" />
              </button>
            )}
          </div>
        );
      },
      size: 120,
    },
  ];
}
