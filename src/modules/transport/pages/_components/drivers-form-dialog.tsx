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

import type { Driver, Truck } from "@/modules/transport/types";
import type { Employee } from "@/modules/hr/types";

import { type DriverFormData, type DriverFormErrors } from "./drivers-constants";

// ── Dialog CRUD ────────────────────────────────────────────

export function DriverDialog({ open, onOpenChange, editingDriver, form, errors, trucks, employees, onFormChange, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; editingDriver: Driver | null;
  form: DriverFormData; errors: DriverFormErrors; trucks: Truck[]; employees: Employee[];
  onFormChange: (patch: Partial<DriverFormData>) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDriver ? t("drivers.edit") : t("drivers.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="name">{t("drivers.fields.name")}</Label>
            <Input id="name" placeholder={t("drivers.placeholders.name")} value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">{t("drivers.fields.phone")}</Label>
            <Input id="phone" placeholder={t("drivers.placeholders.phone")} value={form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="licenseExpiry">{t("drivers.fields.licenseExpiry")}</Label>
            <Input id="licenseExpiry" type="date" value={form.licenseExpiry} onChange={(e) => onFormChange({ licenseExpiry: e.target.value })} />
            {errors.licenseExpiry && <p className="text-xs text-red-500">{errors.licenseExpiry}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="status">{t("drivers.fields.status")}</Label>
            <Select value={form.status} onValueChange={(val) => onFormChange({ status: val as Driver["status"] })}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("drivers.status.available")}</SelectItem>
                <SelectItem value="on_trip">{t("drivers.status.on_trip")}</SelectItem>
                <SelectItem value="off_duty">{t("drivers.status.off_duty")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="employee">{t("drivers.fields.employee", { defaultValue: "Angajat HR" })}</Label>
            <Select value={form.employeeId || "none"} onValueChange={(val) => onFormChange({ employeeId: val === "none" ? "" : val })}>
              <SelectTrigger id="employee"><SelectValue placeholder={t("drivers.placeholders.noEmployee", { defaultValue: "Fara legatura HR" })} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("drivers.placeholders.noEmployee", { defaultValue: "Fara legatura HR" })}</SelectItem>
                {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="truck">{t("drivers.fields.truck")}</Label>
            <Select value={form.truckId || "none"} onValueChange={(val) => onFormChange({ truckId: val === "none" ? "" : val })}>
              <SelectTrigger id="truck"><SelectValue placeholder={t("drivers.placeholders.noTruck")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("drivers.placeholders.noTruck")}</SelectItem>
                {trucks.map((truck) => <SelectItem key={truck.id} value={truck.id}>{truck.plateNumber} — {truck.brand} {truck.model}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("drivers.cancel")}</Button>
          <Button onClick={onSubmit}>{editingDriver ? t("drivers.save") : t("drivers.actions.add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
