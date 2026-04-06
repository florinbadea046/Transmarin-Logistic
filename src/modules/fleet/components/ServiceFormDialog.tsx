import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";

import type { ServiceRecord, Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

import {
  getTypeLabels,
  calculateTotalCost,
} from "@/modules/fleet/utils/serviceUtils";
import {
  createEmptyForm,
  type ServiceFormData,
} from "@/modules/fleet/utils/serviceFormHelpers";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ServiceFormData;
  onFormChange: (form: ServiceFormData) => void;
  editingId: string | null;
  trucks: Truck[];
  onSubmit: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  editingId,
  trucks,
  onSubmit,
}: ServiceFormDialogProps) {
  const { t } = useTranslation();
  const typeLabels = getTypeLabels(t);

  const [parts] = useState<Part[]>(() =>
    getCollection<Part>(STORAGE_KEYS.parts),
  );

  const totalCost = useMemo(
    () => calculateTotalCost(form.partsUsed, parts),
    [form.partsUsed, parts],
  );

  const setForm = (updater: (prev: ServiceFormData) => ServiceFormData) => {
    onFormChange(updater(form));
  };

  const addPart = () => {
    setForm((prev) => ({
      ...prev,
      partsUsed: [
        ...prev.partsUsed,
        { id: crypto.randomUUID(), partId: "", quantity: 1 },
      ],
    }));
  };

  const removePart = (id: string) => {
    setForm((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((p) => p.id !== id),
    }));
  };

  const updatePart = (
    id: string,
    field: "partId" | "quantity",
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          onFormChange(createEmptyForm());
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? t("fleet.service.dialogTitleEdit") : t("fleet.service.dialogTitleAdd")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t("fleet.service.labelTruck")}</Label>
              <Select
                value={form.truckId}
                onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fleet.service.selectTruck")} />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.plateNumber} — {tr.brand} {tr.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("fleet.service.labelType")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as ServiceRecord["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("fleet.service.labelDescription")}</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>{t("fleet.service.labelDate")}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fleet.service.labelMileage")}</Label>
              <Input
                type="number"
                value={form.mileageAtService}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    mileageAtService: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fleet.service.labelNextService")}</Label>
              <Input
                type="date"
                value={form.nextServiceDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nextServiceDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("fleet.service.labelParts")}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPart}
              >
                {t("fleet.service.addPart")}
              </Button>
            </div>
            {form.partsUsed.map((pu) => (
              <div key={pu.id} className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={pu.partId}
                  onValueChange={(v) => updatePart(pu.id, "partId", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("fleet.service.selectPart")} />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unitPrice} RON)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={pu.quantity}
                  onChange={(e) =>
                    updatePart(pu.id, "quantity", Number(e.target.value))
                  }
                  className="sm:w-24"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removePart(pu.id)}
                >
                  ✕
                </Button>
              </div>
            ))}
            {form.partsUsed.length > 0 && (
              <p className="text-sm font-semibold text-right">
                {t("fleet.service.totalCost")} {totalCost.toLocaleString("ro-RO")} RON
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("fleet.service.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!form.truckId || !form.date}
          >
            {t("fleet.service.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
