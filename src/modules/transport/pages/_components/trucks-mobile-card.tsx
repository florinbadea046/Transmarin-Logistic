import { Link, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Driver, Truck } from "@/modules/transport/types";

import { CardRow, ExpiryCell } from "./transport-shared";
import { STATUS_CLASS } from "./trucks-constants";

// ── Mobile Card ────────────────────────────────────────────

export function TruckMobileCard({ truck, driver, onEdit, onDelete, onAssign }: {
  truck: Truck; driver?: Driver; onEdit: () => void; onDelete: () => void; onAssign: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{truck.plateNumber}</p>
          <p className="text-xs text-muted-foreground">{truck.brand} {truck.model} ({truck.year})</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onAssign} aria-label={t("trucks.actions.assign")}><Link className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("trucks.actions.edit")}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("trucks.actions.delete")} className="text-red-500 hover:text-red-600" disabled={truck.status === "on_trip"}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <CardRow label={t("trucks.card.status")}>
          <Badge variant="outline" className={STATUS_CLASS[truck.status]}>{t(`trucks.status.${truck.status}`)}</Badge>
        </CardRow>
        <CardRow label={t("trucks.card.driver")}>{driver ? <span>{driver.name}</span> : <span className="text-muted-foreground">—</span>}</CardRow>
        <CardRow label={t("trucks.card.mileage")}><span>{truck.mileage.toLocaleString("ro-RO")}</span></CardRow>
        <CardRow label={t("trucks.card.itp")}><ExpiryCell dateStr={truck.itpExpiry} /></CardRow>
        <CardRow label={t("trucks.card.rca")}><ExpiryCell dateStr={truck.rcaExpiry} /></CardRow>
        <CardRow label={t("trucks.card.vignette")}><ExpiryCell dateStr={truck.vignetteExpiry} /></CardRow>
      </div>
    </div>
  );
}
