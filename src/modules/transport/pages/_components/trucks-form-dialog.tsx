import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import type { Truck } from "@/modules/transport/types";

import type { TruckFormData, TruckFormErrors } from "./trucks-form-types";

// ── Dialog CRUD ────────────────────────────────────────────

export function TruckDialog({ open, onOpenChange, editingTruck, form, errors, onFormChange, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; editingTruck: Truck | null;
  form: TruckFormData; errors: TruckFormErrors;
  onFormChange: (patch: Partial<TruckFormData>) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingTruck ? t("trucks.edit") : t("trucks.add")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="plateNumber">{t("trucks.fields.plateNumber")}</Label>
            <Input id="plateNumber" placeholder={t("trucks.placeholders.plateNumber")} value={form.plateNumber} onChange={(e) => onFormChange({ plateNumber: e.target.value.toUpperCase() })} />
            {errors.plateNumber && <p className="text-xs text-red-500">{errors.plateNumber}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand">{t("trucks.fields.brand")}</Label>
            <Input id="brand" placeholder={t("trucks.placeholders.brand")} value={form.brand} onChange={(e) => onFormChange({ brand: e.target.value })} />
            {errors.brand && <p className="text-xs text-red-500">{errors.brand}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="model">{t("trucks.fields.model")}</Label>
            <Input id="model" placeholder={t("trucks.placeholders.model")} value={form.model} onChange={(e) => onFormChange({ model: e.target.value })} />
            {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="year">{t("trucks.fields.year")}</Label>
            <Input id="year" type="number" placeholder={t("trucks.placeholders.year")} value={form.year} onChange={(e) => onFormChange({ year: e.target.value })} />
            {errors.year && <p className="text-xs text-red-500">{errors.year}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mileage">{t("trucks.fields.mileage")}</Label>
            <Input id="mileage" type="number" placeholder={t("trucks.placeholders.mileage")} value={form.mileage} onChange={(e) => onFormChange({ mileage: e.target.value })} />
            {errors.mileage && <p className="text-xs text-red-500">{errors.mileage}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="truckStatus">{t("trucks.fields.status")}</Label>
            <Select value={form.status} onValueChange={(val) => onFormChange({ status: val as Truck["status"] })}>
              <SelectTrigger id="truckStatus"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("trucks.status.available")}</SelectItem>
                <SelectItem value="on_trip">{t("trucks.status.on_trip")}</SelectItem>
                <SelectItem value="in_service">{t("trucks.status.in_service")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="itpExpiry">{t("trucks.fields.itpExpiry")}</Label>
            <Input id="itpExpiry" type="date" value={form.itpExpiry} onChange={(e) => onFormChange({ itpExpiry: e.target.value })} />
            {errors.itpExpiry && <p className="text-xs text-red-500">{errors.itpExpiry}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rcaExpiry">{t("trucks.fields.rcaExpiry")}</Label>
            <Input id="rcaExpiry" type="date" value={form.rcaExpiry} onChange={(e) => onFormChange({ rcaExpiry: e.target.value })} />
            {errors.rcaExpiry && <p className="text-xs text-red-500">{errors.rcaExpiry}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="vignetteExpiry">{t("trucks.fields.vignetteExpiry")}</Label>
            <Input id="vignetteExpiry" type="date" value={form.vignetteExpiry} onChange={(e) => onFormChange({ vignetteExpiry: e.target.value })} />
            {errors.vignetteExpiry && <p className="text-xs text-red-500">{errors.vignetteExpiry}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("trucks.cancel")}</Button>
          <Button onClick={onSubmit}>{editingTruck ? t("trucks.save") : t("trucks.actions.add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
