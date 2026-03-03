import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";

export function TrucksCount() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.trucks);
    if (raw) setTrucks(JSON.parse(raw));
  }, []);

  const availableCount = trucks.filter((t) => t.status === "available").length;

  return (
    <>
      <p className="text-3xl font-bold">{trucks.length}</p>
      <p className="text-sm text-muted-foreground">{availableCount} disponibile</p>
    </>
  );
}