import { useEffect, useState } from "react";
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
import type { ServiceRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

type ServiceStatus = "overdue" | "soon" | "ok" | "no_date";

interface TruckServiceRow {
  truck: Truck;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  lastServiceType: string | null;
  status: ServiceStatus;
  daysUntil: number | null;
}

interface ServiceScheduleProps {
  records: ServiceRecord[];
  trucks: Truck[];
}

const TYPE_LABELS: Record<ServiceRecord["type"], string> = {
  revision: "Revizie",
  repair: "Reparație",
  itp: "ITP",
  other: "Altele",
};

const SOON_THRESHOLD_DAYS = 30;

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatus(nextServiceDate: string | null): { status: ServiceStatus; daysUntil: number | null } {
  if (!nextServiceDate) return { status: "no_date", daysUntil: null };
  const days = getDaysUntil(nextServiceDate);
  if (days < 0) return { status: "overdue", daysUntil: days };
  if (days <= SOON_THRESHOLD_DAYS) return { status: "soon", daysUntil: days };
  return { status: "ok", daysUntil: days };
}

export function ServiceSchedule({ records, trucks }: ServiceScheduleProps) {
  const [rows, setRows] = useState<TruckServiceRow[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [soonCount, setSoonCount] = useState(0);

  useEffect(() => {
    const built: TruckServiceRow[] = trucks.map((truck) => {
      const truckRecords = records
        .filter((r) => r.truckId === truck.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      const latest = truckRecords[0] ?? null;
      const nextServiceDate = latest?.nextServiceDate ?? null;
      const { status, daysUntil } = getStatus(nextServiceDate);

      return {
        truck,
        lastServiceDate: latest?.date ?? null,
        nextServiceDate,
        lastServiceType: latest ? TYPE_LABELS[latest.type] : null,
        status,
        daysUntil,
      };
    });

    const order: Record<ServiceStatus, number> = { overdue: 0, soon: 1, ok: 2, no_date: 3 };
    built.sort((a, b) => order[a.status] - order[b.status]);

    setRows(built);
    setOverdueCount(built.filter((r) => r.status === "overdue").length);
    setSoonCount(built.filter((r) => r.status === "soon").length);
  }, [records, trucks]);

  const statusBadge = (row: TruckServiceRow) => {
    switch (row.status) {
      case "overdue":
        return <Badge className="bg-white text-red-600 border border-red-600">⚠ Restant</Badge>;
      case "soon":
        return <Badge className="bg-white text-yellow-600 border border-yellow-600">În curând</Badge>;
      case "ok":
        return <Badge className="bg-white text-green-600 border border-green-600">OK</Badge>;
      case "no_date":
        return <Badge variant="outline">Neprogramat</Badge>;
    }
  };

  const daysLabel = (row: TruckServiceRow) => {
    if (row.daysUntil === null) return "—";
    if (row.daysUntil < 0) return `${Math.abs(row.daysUntil)} zile întârziere`;
    if (row.daysUntil === 0) return "Azi";
    return `${row.daysUntil} zile`;
  };

  const textClass = (status: ServiceStatus) =>
    status === "overdue" || status === "soon" ? "text-black" : "text-white";

  return (
    <div className="flex flex-col gap-4">

      {(overdueCount > 0 || soonCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex-1 min-w-[220px]">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-bold text-red-700 dark:text-red-300 text-sm">
                  {overdueCount} {overdueCount === 1 ? "vehicul cu service restant" : "vehicule cu service restant"}
                </p>
                <p className="text-red-500 dark:text-red-400 text-xs">Programează service imediat</p>
              </div>
            </div>
          )}
          {soonCount > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 flex-1 min-w-[220px]">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-yellow-700 dark:text-yellow-300 text-sm">
                  {soonCount} {soonCount === 1 ? "vehicul cu service în următoarele 30 zile" : "vehicule cu service în următoarele 30 zile"}
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 text-xs">Planifică din timp</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Programare Service Vehicule</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicul</TableHead>
                  <TableHead>Ultimul service</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Următor service</TableHead>
                  <TableHead>Zile rămase</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.truck.id}
                    className={
                      row.status === "overdue"
                        ? "bg-red-500 dark:bg-red-600"
                        : row.status === "soon"
                          ? "bg-yellow-500 dark:bg-yellow-600"
                          : ""
                    }
                  >
                    <TableCell className={`font-semibold ${textClass(row.status)}`}>
                      {row.truck.plateNumber}
                      <span className={`font-normal ml-1 text-xs ${row.status === "overdue" || row.status === "soon"
                          ? "text-black/60"
                          : "text-muted-foreground"
                        }`}>
                        {row.truck.brand} {row.truck.model}
                      </span>
                    </TableCell>
                    <TableCell className={textClass(row.status)}>{row.lastServiceDate ?? "—"}</TableCell>
                    <TableCell className={textClass(row.status)}>{row.lastServiceType ?? "—"}</TableCell>
                    <TableCell className={`font-medium ${textClass(row.status)}`}>{row.nextServiceDate ?? "—"}</TableCell>
                    <TableCell className={`font-semibold ${textClass(row.status)}`}>{daysLabel(row)}</TableCell>
                    <TableCell>{statusBadge(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}