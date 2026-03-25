import { useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { ServiceRecord } from "@/modules/fleet/types";

export function ServiceCostMonth() {
  const { t } = useTranslation();
  const [records] = useState<ServiceRecord[]>(() =>
    getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords),
  );

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
      <p className="text-sm text-muted-foreground">
        {t("fleet.service.currentMonth")}
      </p>
    </>
  );
}
