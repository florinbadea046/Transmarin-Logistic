import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Truck } from "@/modules/transport/types";
import {
  STATUS_CONFIG,
  getDateStatus,
} from "@/modules/fleet/utils/truckUtils";

// ── DateCell ──────────────────────────────────────────────

const DateCell = ({ date }: { date: string }) => {
  const status = getDateStatus(date);

  if (status === "expired") {
    return (
      <span className="text-red-600 font-semibold">
        {date} <span aria-hidden="true">⚠️</span>
        <span className="sr-only">Expirat</span>
      </span>
    );
  }

  if (status === "soon") {
    return (
      <span className="text-amber-500 font-semibold">
        {date} <span aria-hidden="true">⚠️</span>
        <span className="sr-only">Expiră curând</span>
      </span>
    );
  }

  return <span>{date}</span>;
};

// ── ExpiryBadge pentru dialog ─────────────────────────────

function getDaysRemaining(dateStr: string): number {
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ dateStr, label }: { dateStr: string; label: string }) {
  const days = getDaysRemaining(dateStr);
  const status = days < 0 ? "red" : days <= 30 ? "yellow" : "green";

  const colorClass = {
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
  }[status];

  const icon = { green: "🟢", yellow: "🟡", red: "🔴" }[status];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="outline" className={colorClass}>
        {icon} {dateStr}{" "}
        {days < 0
          ? `(expirat de ${Math.abs(days)} zile)`
          : `(${days} zile rămase)`}
      </Badge>
    </div>
  );
}

// ── VehicleDialog ─────────────────────────────────────────

function VehicleDialog({
  truck,
  open,
  onOpenChange,
}: {
  truck: Truck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!truck) return null;

  const { label, variant } = STATUS_CONFIG[truck.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {truck.plateNumber} — {truck.brand} {truck.model}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date tehnice */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Date tehnice
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">An fabricație:</span>
                <span className="ml-2 font-medium">{truck.year}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Kilometraj:</span>
                <span className="ml-2 font-medium">
                  {truck.mileage.toLocaleString("ro-RO")} km
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={variant} className="ml-2">
                  {label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Semaforizare */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Documente
            </h3>
            <div className="space-y-2">
              <ExpiryBadge dateStr={truck.itpExpiry} label="ITP" />
              <ExpiryBadge dateStr={truck.rcaExpiry} label="RCA" />
              <ExpiryBadge dateStr={truck.vignetteExpiry} label="Vignetă" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── TrucksTable ───────────────────────────────────────────

export function TrucksTable() {
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks)
  );
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRowClick = (truck: Truck) => {
    setSelectedTruck(truck);
    setDialogOpen(true);
  };

  if (trucks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-10">
        Nu există camioane înregistrate.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr. înmatriculare</TableHead>
              <TableHead>Marcă / Model</TableHead>
              <TableHead>An</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ITP</TableHead>
              <TableHead>RCA</TableHead>
              <TableHead>Vignetă</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trucks.map((truck) => {
              const { label, variant } = STATUS_CONFIG[truck.status];

              return (
                <TableRow
                  key={truck.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(truck)}
                >
                  <TableCell className="font-semibold">
                    {truck.plateNumber}
                  </TableCell>
                  <TableCell>
                    {truck.brand} {truck.model}
                  </TableCell>
                  <TableCell>{truck.year}</TableCell>
                  <TableCell>
                    {truck.mileage.toLocaleString("ro-RO")} km
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell>
                    <DateCell date={truck.itpExpiry} />
                  </TableCell>
                  <TableCell>
                    <DateCell date={truck.rcaExpiry} />
                  </TableCell>
                  <TableCell>
                    <DateCell date={truck.vignetteExpiry} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <VehicleDialog
        truck={selectedTruck}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}