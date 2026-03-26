import { useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";

export function ServiceCount() {
  const { t } = useTranslation();
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks),
  );

  const inServiceCount = trucks.filter((t) => t.status === "in_service").length;

  return (
    <>
      <p className="text-3xl font-bold">{inServiceCount}</p>
      <p className="text-sm text-muted-foreground">
        {inServiceCount > 0
          ? t("fleet.service.trucksInService")
          : t("fleet.service.noActiveService")}
      </p>
    </>
  );
}
