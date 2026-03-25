import { useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Part } from "@/modules/fleet/types";

export function LowStockCount() {
  const { t } = useTranslation();
  const [parts] = useState<Part[]>(() =>
    getCollection<Part>(STORAGE_KEYS.parts),
  );

  const lowStockCount = parts.filter((p) => p.quantity < p.minStock).length;

  return (
    <>
      <p
        className={`text-3xl font-bold ${lowStockCount > 0 ? "text-red-500" : "text-green-500"}`}
      >
        {lowStockCount}
      </p>
      <p className="text-sm text-muted-foreground">
        {lowStockCount > 0
          ? t("fleet.parts.needsRestock")
          : t("fleet.parts.stockOk")}
      </p>
    </>
  );
}
