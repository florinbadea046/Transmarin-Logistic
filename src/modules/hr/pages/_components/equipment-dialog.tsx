import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type {
  Employee,
  Equipment,
  EquipmentType,
  EquipmentCondition,
} from "@/modules/hr/types";
import { EQUIPMENT_TYPES, EQUIPMENT_CONDITIONS } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";
import {
  makeEquipmentSchema,
  type EquipmentFormValues,
} from "./equipment-schema";

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  equipment?: Equipment;
  onSaved: () => void;
}

export function EquipmentDialog({
  open,
  onOpenChange,
  employees,
  equipment,
  onSaved,
}: EquipmentDialogProps) {
  const { t, i18n } = useTranslation();
  const { log } = useHrAuditLog();
  const isEdit = !!equipment;

  const schema = React.useMemo(
    () => makeEquipmentSchema(t),
    [t, i18n.language],
  );
  const resolver = React.useMemo(
    () => zodResolver(schema) as Resolver<EquipmentFormValues>,
    [schema],
  );

  // NOTĂ: returnedAt (data returnării efective) se setează doar din acțiunea „Marchează ca returnat”, nu din dialogul de editare generală.
  // Formularul nu expune și nu resetează acest câmp, pentru a evita confuzii și a păstra o singură sursă de adevăr pentru returnare.
  const form = useForm<EquipmentFormValues>({
    resolver,
    defaultValues: {
      type: "laptop",
      inventoryNumber: "",
      employeeId: "",
      assignedDate: "",
      returnedDate: "",
      condition: "new",
      value: 0,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        type: equipment?.type ?? "laptop",
        inventoryNumber: equipment?.inventoryNumber ?? "",
        employeeId: equipment?.employeeId ?? "",
        assignedDate: equipment?.assignedDate ?? "",
        returnedDate: equipment?.returnedDate ?? "",
        condition: equipment?.condition ?? "new",
        value: equipment?.value ?? 0,
        notes: equipment?.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipment]);

  const handleSubmit = (values: EquipmentFormValues) => {
    const emp = employees.find((e) => e.id === values.employeeId);
    // Eliminăm orice referință la returnedConfirmed, folosim doar returnedAt dacă e cazul
    const { returnedConfirmed, ...rest } = values as any;
    const cleanValues = {
      ...rest,
      employeeName: emp?.name,
      returnedDate: values.returnedDate || undefined,
      notes: values.notes || undefined,
    };

    if (isEdit && equipment) {
      const updated: Equipment = { ...equipment, ...cleanValues };
      updateItem<Equipment>(
        STORAGE_KEYS.equipment,
        (e) => e.id === equipment.id,
        () => updated,
      );
      log({
        action: "update",
        entity: "equipment",
        entityId: equipment.id,
        entityLabel: `${t(`equipment.type.${values.type}`)} — ${values.inventoryNumber}`,
      });
      toast.success(t("equipment.toast.updated"));
    } else {
      const newId = generateId();
      const item: Equipment = { id: newId, ...cleanValues };
      addItem<Equipment>(STORAGE_KEYS.equipment, item);
      log({
        action: "create",
        entity: "equipment",
        entityId: newId,
        entityLabel: `${t(`equipment.type.${values.type}`)} — ${values.inventoryNumber}`,
      });
      toast.success(t("equipment.toast.created"));
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEdit
              ? t("equipment.dialog.editTitle")
              : t("equipment.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Type */}
            <div className="space-y-1">
              <Label>{t("equipment.fields.type")}</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as EquipmentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((et) => (
                        <SelectItem key={et} value={et}>
                          {t(`equipment.type.${et}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            {/* Condition */}
            <div className="space-y-1">
              <Label>{t("equipment.fields.condition")}</Label>
              <Controller
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) =>
                      field.onChange(v as EquipmentCondition)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`equipment.condition.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.condition && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.condition.message}
                </p>
              )}
            </div>
          </div>

          {/* Inventory Number */}
          <div className="space-y-1">
            <Label htmlFor="inventoryNumber">
              {t("equipment.fields.inventoryNumber")}
            </Label>
            <Input
              id="inventoryNumber"
              placeholder={t("equipment.fields.inventoryPlaceholder")}
              {...form.register("inventoryNumber")}
            />
            {form.formState.errors.inventoryNumber && (
              <p className="text-xs text-red-500">
                {form.formState.errors.inventoryNumber.message}
              </p>
            )}
          </div>

          {/* Employee */}
          <div className="space-y-1">
            <Label>{t("equipment.fields.employee")}</Label>
            <Controller
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("equipment.fields.employeePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} — {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.employeeId && (
              <p className="text-xs text-red-500">
                {form.formState.errors.employeeId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assigned Date */}
            <div className="space-y-1">
              <Label htmlFor="assignedDate">
                {t("equipment.fields.assignedDate")}
              </Label>
              <Input
                id="assignedDate"
                type="date"
                {...form.register("assignedDate")}
              />
              {form.formState.errors.assignedDate && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.assignedDate.message}
                </p>
              )}
            </div>

            {/* Returned Date */}
            <div className="space-y-1">
              <Label htmlFor="returnedDate">
                {t("equipment.fields.returnedDate")}
              </Label>
              <Input
                id="returnedDate"
                type="date"
                {...form.register("returnedDate")}
              />
              {form.formState.errors.returnedDate && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.returnedDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Value */}
          <div className="space-y-1">
            <Label htmlFor="value">{t("equipment.fields.value")}</Label>
            <Input
              id="value"
              type="number"
              min={0}
              step={0.01}
              {...form.register("value")}
            />
            {form.formState.errors.value && (
              <p className="text-xs text-red-500">
                {form.formState.errors.value.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">{t("equipment.fields.notes")}</Label>
            <Input
              id="notes"
              placeholder={t("equipment.fields.notesPlaceholder")}
              {...form.register("notes")}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {t("equipment.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              {t("equipment.actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
