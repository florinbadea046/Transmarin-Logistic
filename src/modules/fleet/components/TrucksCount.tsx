import { useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Truck } from "@/modules/transport/types";

export function TrucksCount() {
  const { t } = useTranslation();
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks),
  );

  const availableCount = trucks.filter((t) => t.status === "available").length;

  return (
    <>
      <p className="text-3xl font-bold">{trucks.length}</p>
      <p className="text-sm text-muted-foreground">
        {t("fleet.trucks.availableCount", { count: availableCount })}
      </p>
    </>
  );
}
