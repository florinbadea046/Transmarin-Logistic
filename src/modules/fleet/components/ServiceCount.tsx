import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";

export function ServiceCount() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.trucks);
    if (raw) setTrucks(JSON.parse(raw));
  }, []);

  const inServiceCount = trucks.filter((t) => t.status === "in_service").length;

  return (
    <>
      <p className="text-3xl font-bold">{inServiceCount}</p>
      <p className="text-sm text-muted-foreground">
        {inServiceCount > 0 ? "Camioane în service" : "Niciun service activ"}
      </p>
    </>
  );
}