import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Driver, Truck } from "@/modules/transport/types";

import { CardRow, ExpiryCell } from "./transport-shared";
import { DRIVER_STATUS_CLASS } from "./drivers-constants";

// ── Mobile Card ────────────────────────────────────────────

export function DriverMobileCard({ driver, truck, onEdit, onDelete, onViewProfile }: {
  driver: Driver; truck?: Truck; onEdit: () => void; onDelete: () => void; onViewProfile: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button className="font-semibold leading-tight hover:underline text-primary text-left" onClick={onViewProfile}>
            {driver.name}
          </button>
          <p className="text-xs text-muted-foreground">{driver.phone}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("drivers.actions.edit")}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("drivers.actions.delete")} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label={t("drivers.card.status")}>
          <Badge variant="outline" className={DRIVER_STATUS_CLASS[driver.status]}>{t(`drivers.status.${driver.status}`)}</Badge>
        </CardRow>
        <CardRow label={t("drivers.card.licenseExpiry")}><ExpiryCell dateStr={driver.licenseExpiry} /></CardRow>
        <CardRow label={t("drivers.card.truck")}>
          {truck ? <span>{truck.plateNumber}</span> : <span className="text-muted-foreground">—</span>}
        </CardRow>
      </div>
    </div>
  );
}
