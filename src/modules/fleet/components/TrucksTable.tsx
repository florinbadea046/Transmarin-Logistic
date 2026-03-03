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
import {
  STATUS_CONFIG,
  getDateStatus,
} from "@/modules/fleet/utils/truckUtils";

const DateCell = ({ date }: { date: string }) => {
  const status = getDateStatus(date);

  if (status === "expired") {
    return (
      <span className="text-red-600 font-semibold">
        {date} ⚠️
      </span>
    );
  }

  if (status === "soon") {
    return (
      <span className="text-amber-500 font-semibold">
        {date} ⚠️
      </span>
    );
  }

  return <span>{date}</span>;
};

export function TrucksTable() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  if (trucks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-10">
        Nu există camioane înregistrate.
      </p>
    );
  }

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
            const { label, variant } =
              STATUS_CONFIG[truck.status];

            return (
              <TableRow key={truck.id}>
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
                  <Badge variant={variant}>
                    {label}
                  </Badge>
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
  );
}