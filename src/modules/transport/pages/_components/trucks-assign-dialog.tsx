import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import type { Driver, Truck } from "@/modules/transport/types";

// ── Assign Dialog ──────────────────────────────────────────

export function AssignDialog({ open, onOpenChange, truck, drivers, selectedDriverId, onDriverChange, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; truck: Truck | null;
  drivers: Driver[]; selectedDriverId: string; onDriverChange: (id: string) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("trucks.assignTitle", { plateNumber: truck?.plateNumber ?? "" })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="assignDriver">{t("trucks.assign.selectDriver")}</Label>
            <Select value={selectedDriverId || "none"} onValueChange={(val) => onDriverChange(val === "none" ? "" : val)}>
              <SelectTrigger id="assignDriver"><SelectValue placeholder={t("trucks.placeholders.selectDriver")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("trucks.placeholders.noDriver")}</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}{d.truckId && d.truckId !== truck?.id ? t("trucks.assign.hasTrack") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("trucks.actions.cancel")}</Button>
          <Button onClick={onSubmit}>{t("trucks.actions.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
