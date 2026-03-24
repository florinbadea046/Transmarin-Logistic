import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { FuelRecord } from "@/modules/fleet/types";

export function FuelCostMonth() {
  const [records, setRecords] = useState<FuelRecord[]>([]);

  useEffect(() => {
    setRecords(getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords));
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalCost = records
    .filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + r.cost, 0);

  return (
    <>
      <p className="text-3xl font-bold">
        {totalCost.toLocaleString("ro-RO")} RON
      </p>
      <p className="text-sm text-muted-foreground">Luna curentă</p>
    </>
  );
}
