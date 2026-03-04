import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";



export function ServiceCount() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
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