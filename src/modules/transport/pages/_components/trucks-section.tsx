// ──────────────────────────────────────────────────────────
// TrucksSection — card Camioane cu tabel și dialog asociere
// ──────────────────────────────────────────────────────────

import * as React from "react";
import {
  type ColumnDef,
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
import { Link } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTableColumnHeader } from "@/components/data-table/column-header";

import type { Driver, Truck } from "@/modules/transport/types";
import { updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import useDialogState from "@/hooks/use-dialog-state";

import { CardRow, EntityTable, ExpiryCell } from "./transport-shared";

// ── Constante ──────────────────────────────────────────────

const TRUCK_STATUS_LABELS: Record<Truck["status"], string> = {
  available: "Disponibil",
  on_trip: "În cursă",
  in_service: "În service",
};

const TRUCK_STATUS_CLASS: Record<Truck["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
};

const statusFilterOptions = (Object.keys(TRUCK_STATUS_LABELS) as Truck["status"][]).map(
  (value) => ({ value, label: TRUCK_STATUS_LABELS[value] }),
);

// ── TruckMobileCard ────────────────────────────────────────

function TruckMobileCard({
  truck,
  driver,
  onAssign,
}: {
  truck: Truck;
  driver?: Driver;
  onAssign: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{truck.plateNumber}</p>
          <p className="text-xs text-muted-foreground">
            {truck.brand} {truck.model} ({truck.year})
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onAssign} aria-label="Asociere șofer">
          <Link className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1.5">
        <CardRow label="Status">
          <Badge variant="outline" className={TRUCK_STATUS_CLASS[truck.status]}>
            {TRUCK_STATUS_LABELS[truck.status]}
          </Badge>
        </CardRow>
        <CardRow label="Șofer">
          {driver
            ? <span>{driver.name}</span>
            : <span className="text-muted-foreground">—</span>}
        </CardRow>
        <CardRow label="ITP">
          <ExpiryCell dateStr={truck.itpExpiry} />
        </CardRow>
        <CardRow label="RCA">
          <ExpiryCell dateStr={truck.rcaExpiry} />
        </CardRow>
        <CardRow label="Vignetă">
          <ExpiryCell dateStr={truck.vignetteExpiry} />
        </CardRow>
      </div>
    </div>
  );
}

// ── AssignDialog ───────────────────────────────────────────

function AssignDialog({
  open,
  onOpenChange,
  truck,
  drivers,
  selectedDriverId,
  onDriverChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  drivers: Driver[];
  selectedDriverId: string;
  onDriverChange: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Asociere Șofer — {truck?.plateNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="assignDriver">Selectează șofer</Label>
            <Select
              value={selectedDriverId || "none"}
              onValueChange={(val) => onDriverChange(val === "none" ? "" : val)}
            >
              <SelectTrigger id="assignDriver"><SelectValue placeholder="Fără șofer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Fără șofer</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.truckId && driver.truckId !== truck?.id ? " (are camion)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={onSubmit}>Salvează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── TrucksSection ──────────────────────────────────────────

export function TrucksSection({
  drivers,
  trucks,
  onDataChange,
}: {
  drivers: Driver[];
  trucks: Truck[];
  onDataChange: () => void;
}) {
  const [assignDialogOpen, setAssignDialogOpen] = useDialogState();
  const [assigningTruck, setAssigningTruck] = React.useState<Truck | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>("");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const getDriver = React.useCallback(
    (truck: Truck) => drivers.find((d) => d.truckId === truck.id),
    [drivers],
  );

  // ── Handlers ──

  const handleOpenAssign = (truck: Truck) => {
    setAssigningTruck(truck);
    setSelectedDriverId(drivers.find((d) => d.truckId === truck.id)?.id ?? "");
    setAssignDialogOpen(true);
  };

  const handleSubmitAssign = () => {
    if (!assigningTruck) return;
    updateItem<Driver>(
      STORAGE_KEYS.drivers,
      (d) => d.truckId === assigningTruck.id,
      (d) => ({ ...d, truckId: undefined }),
    );
    if (selectedDriverId && selectedDriverId !== "none") {
      updateItem<Driver>(
        STORAGE_KEYS.drivers,
        (d) => d.id === selectedDriverId,
        (d) => ({ ...d, truckId: assigningTruck.id }),
      );
      toast.success("Asocierea a fost salvată.");
    } else {
      toast.success("Camionul a fost dezasociat.");
    }
    setAssignDialogOpen(false);
    onDataChange();
  };

  // ── Coloane ──

  const columns: ColumnDef<Truck>[] = React.useMemo(() => [
    {
      accessorKey: "plateNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Camion" />,
      cell: ({ row }) => {
        const driver = getDriver(row.original);
        return (
          <div className="font-medium">
            <div>{row.getValue("plateNumber")}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.brand} {row.original.model} ({row.original.year})
            </div>
            {driver && (
              <div className="text-xs text-muted-foreground lg:hidden">{driver.name}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Truck["status"];
        return (
          <Badge variant="outline" className={`whitespace-nowrap ${TRUCK_STATUS_CLASS[status]}`}>
            {TRUCK_STATUS_LABELS[status]}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        return !selected || selected.length === 0 || selected.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "itpExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ITP" />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("itpExpiry")} />,
    },
    {
      accessorKey: "rcaExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title="RCA" />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("rcaExpiry")} />,
    },
    {
      accessorKey: "vignetteExpiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vignetă" />,
      cell: ({ row }) => <ExpiryCell dateStr={row.getValue("vignetteExpiry")} />,
    },
    {
      id: "driverName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Șofer" />,
      cell: ({ row }) => {
        const driver = getDriver(row.original);
        return (
          <div className="text-sm text-muted-foreground">{driver ? driver.name : "—"}</div>
        );
      },
      enableSorting: false,
    },
    {
      id: "assign",
      header: () => <div className="text-right">Asociere</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenAssign(row.original)}
            aria-label="Asociere șofer"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [drivers]);

  const table = useReactTable({
    data: trucks,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // ── Render ──

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Camioane</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityTable
            table={table}
            columns={columns}
            searchPlaceholder="Caută camioane..."
            searchKey="plateNumber"
            filterConfig={[{ columnId: "status", title: "Status", options: statusFilterOptions }]}
            columnVisibilityClass={{
              rcaExpiry: "hidden md:table-cell",
              vignetteExpiry: "hidden md:table-cell",
              driverName: "hidden lg:table-cell",
            }}
            emptyText="Nu există camioane pentru filtrul curent."
            renderMobileCard={(truck) => (
              <TruckMobileCard
                truck={truck}
                driver={getDriver(truck)}
                onAssign={() => handleOpenAssign(truck)}
              />
            )}
          />
        </CardContent>
      </Card>

      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        truck={assigningTruck}
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        onDriverChange={setSelectedDriverId}
        onSubmit={handleSubmitAssign}
      />
    </>
  );
}