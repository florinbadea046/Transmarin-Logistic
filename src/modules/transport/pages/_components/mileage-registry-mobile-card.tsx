import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { RowData } from "./mileage-registry-utils";

interface MileageMobileCardProps {
  row: RowData;
  onEdit: (row: RowData) => void;
}

export function MileageMobileCard({ row: r, onEdit }: MileageMobileCardProps) {
  const { t } = useTranslation();

  return (
    <Card key={r.truck.id} className="p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono font-bold text-sm">
            {r.truck.plateNumber}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.truck.brand} {r.truck.model}
          </p>
        </div>
        {r.hasAlert ? (
          <Badge
            variant="destructive"
            className="text-xs shrink-0"
          >
            {(r.discrepancyPct * 100).toFixed(1)}%
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs shrink-0"
          >
            {(r.discrepancyPct * 100).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
        <div>
          <span className="text-muted-foreground">
            {t("mileageRegistry.columns.kmStart")}:{" "}
          </span>
          {r.kmStart.toLocaleString()}
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("mileageRegistry.columns.kmEnd")}:{" "}
          </span>
          {r.kmEnd.toLocaleString()}
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("mileageRegistry.columns.kmDriven")}:{" "}
          </span>
          <strong>{r.kmDriven.toLocaleString()}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("mileageRegistry.columns.kmTrips")}:{" "}
          </span>
          {r.kmTrips.toLocaleString()}
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">
            {t("mileageRegistry.columns.avgPerDay")}:{" "}
          </span>
          {r.avgPerDay.toLocaleString()} km
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full h-7 text-xs"
        onClick={() => onEdit(r)}
      >
        <Pencil className="h-3 w-3 mr-1" />
        {t("mileageRegistry.actions.update")}
      </Button>
    </Card>
  );
}
