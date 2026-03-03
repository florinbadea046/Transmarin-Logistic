import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Part } from "@/modules/fleet/types";

export function LowStockCount() {
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.parts);
    if (raw) setParts(JSON.parse(raw));
  }, []);

  const lowStockCount = parts.filter((p) => p.quantity < p.minStock).length;

  return (
    <>
      <p className={`text-3xl font-bold ${lowStockCount > 0 ? "text-red-500" : "text-green-500"}`}>
        {lowStockCount}
      </p>
      <p className="text-sm text-muted-foreground">
        {lowStockCount > 0 ? "Necesită reaprovizionare" : "Stoc OK"}
      </p>
    </>
  );
}