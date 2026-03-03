import { useEffect, useState } from "react";
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
import type { Truck } from "@/modules/transport/types";

const statusConfig: Record<Truck["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available:  { label: "Disponibil",  variant: "default" },
  on_trip:    { label: "În cursă",    variant: "secondary" },
  in_service: { label: "În service",  variant: "destructive" },
};

const isExpired = (dateStr: string) => new Date(dateStr).getTime() < Date.now();
const isExpiringSoon = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
};

const DateCell = ({ date }: { date: string }) => {
  if (isExpired(date))
    return (
      <span className="text-red-600 font-semibold">
        {date} <span aria-hidden="true">⚠️</span>
        <span className="sr-only">Expirat</span>
      </span>
    );
  if (isExpiringSoon(date))
    return (
      <span className="text-amber-500 font-semibold">
        {date} <span aria-hidden="true">⚠️</span>
        <span className="sr-only">Expiră curând</span>
      </span>
    );
  return <span>{date}</span>;
};

export function TrucksTable() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  if (trucks.length === 0)
    return <p className="text-muted-foreground text-center py-10">Nu există camioane înregistrate.</p>;

  return (
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
            const { label, variant } = statusConfig[truck.status];
            return (
              <TableRow key={truck.id}>
                <TableCell className="font-semibold">{truck.plateNumber}</TableCell>
                <TableCell>{truck.brand} {truck.model}</TableCell>
                <TableCell>{truck.year}</TableCell>
                <TableCell>{truck.mileage.toLocaleString("ro-RO")} km</TableCell>
                <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                <TableCell><DateCell date={truck.itpExpiry} /></TableCell>
                <TableCell><DateCell date={truck.rcaExpiry} /></TableCell>
                <TableCell><DateCell date={truck.vignetteExpiry} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}