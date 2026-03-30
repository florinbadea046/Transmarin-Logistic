import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpiryDatePicker } from "./expiry-date-picker";
import type { Employee, Bonus } from "@/modules/hr/types";
import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { BONUS_TYPE_LABELS } from "../payroll/payroll-shared";
import { getHRSettings } from "../utils/get-hr-settings";

const BONUS_FORM_TYPES = ["bonus", "amenda", "ore_suplimentare"] as const;

const bonusSchema = z.object({
  employeeId: z.string().min(1, "Selectați un angajat"),
  type: z.enum(BONUS_FORM_TYPES),
  amount: z.number().refine((value) => value !== 0, {
    message: "Suma nu poate fi 0",
  }),
  date: z.string().min(1, "Data este obligatorie"),
  description: z.string().min(5, "Descrierea trebuie să aibă cel puțin 5 caractere"),
});

type BonusFormValues = z.infer<typeof bonusSchema>;

interface Props {
  mode: "add" | "edit";
  bonus?: Bonus;
  employees: Employee[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}

export default function BonusDialog({
  mode,
  bonus,
  employees,
  open,
  onOpenChange,
  onSave,
}: Props) {
  const isEdit = mode === "edit";
  const initialType =
    bonus?.type && BONUS_FORM_TYPES.includes(bonus.type as (typeof BONUS_FORM_TYPES)[number])
      ? (bonus.type as (typeof BONUS_FORM_TYPES)[number])
      : undefined;

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    bonus?.date ? new Date(bonus.date) : new Date(),
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const form = useForm<BonusFormValues>({
    resolver: zodResolver(bonusSchema),
    defaultValues: {
      employeeId: bonus?.employeeId ?? "",
      type: initialType as BonusFormValues["type"],
      amount: bonus?.amount ?? 0,
      date: bonus?.date ?? todayStr,
      description: bonus?.description ?? "",
    },
  });

  const { log } = useHrAuditLog();
  const currency = React.useMemo(() => getHRSettings().bonusCurrency, []);
  const employeeId = useWatch({ control: form.control, name: "employeeId" });
  const type = useWatch({ control: form.control, name: "type" });

  React.useEffect(() => {
    if (open) {
      form.reset({
        employeeId: bonus?.employeeId ?? "",
        type: initialType as BonusFormValues["type"],
        amount: bonus?.amount ?? 0,
        date: bonus?.date ?? todayStr,
        description: bonus?.description ?? "",
      });
      setSelectedDate(bonus?.date ? new Date(bonus.date) : new Date());
    }
  }, [open, bonus, form, initialType, todayStr]);

  const handleSubmit = (values: BonusFormValues) => {
    const normalizedAmount =
      values.type === "amenda" ? -Math.abs(values.amount) : Math.abs(values.amount);
    const payload = { ...values, amount: normalizedAmount };

    const empName = employees.find((e) => e.id === values.employeeId)?.name ?? values.employeeId;
    if (isEdit && bonus) {
      updateItem<Bonus>(
        STORAGE_KEYS.bonuses,
        (b) => b.id === bonus.id,
        () => ({ ...bonus, ...payload }),
      );
      log({
        action: "update",
        entity: "bonus",
        entityId: bonus.id,
        entityLabel: empName,
        details: `${values.type}: ${normalizedAmount} RON`,
        oldValue: { amount: bonus.amount, type: bonus.type, description: bonus.description },
        newValue: { amount: normalizedAmount, type: values.type, description: values.description },
      });
    } else {
      const newId = generateId();
      addItem<Bonus>(STORAGE_KEYS.bonuses, { ...payload, id: newId });
      log({
        action: "create",
        entity: "bonus",
        entityId: newId,
        entityLabel: empName,
        details: `${values.type}: ${normalizedAmount} RON`,
        newValue: { amount: normalizedAmount, type: values.type, description: values.description },
      });
    }
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) form.reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editează înregistrare" : "Adaugă bonus / penalizare"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <Select
            value={employeeId}
            onValueChange={(val) =>
              form.setValue("employeeId", val, { shouldValidate: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selectați angajat" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.employeeId && (
            <span className="text-xs text-red-500">
              {form.formState.errors.employeeId.message}
            </span>
          )}

          <Select
            value={type}
            onValueChange={(val) =>
              form.setValue("type", val as BonusFormValues["type"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selectați tip" />
            </SelectTrigger>
            <SelectContent>
              {(
                BONUS_FORM_TYPES.map(
                  (val) => [val, BONUS_TYPE_LABELS[val]] as const,
                )
              ).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <span className="text-xs text-red-500">
              {form.formState.errors.type.message}
            </span>
          )}

          <Input
            type="number"
            placeholder={`Sumă (${currency})`}
            {...form.register("amount", { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <span className="text-xs text-red-500">
              {form.formState.errors.amount.message}
            </span>
          )}

          <div className="[&>button]:w-full">
            <ExpiryDatePicker
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                form.setValue(
                  "date",
                  date ? date.toISOString().slice(0, 10) : "",
                );
              }}
              placeholder="Dată"
            />
          </div>
          {form.formState.errors.date && (
            <span className="text-xs text-red-500">
              {form.formState.errors.date.message}
            </span>
          )}

          <Input placeholder="Descriere" {...form.register("description")} />
          {form.formState.errors.description && (
            <span className="text-xs text-red-500">
              {form.formState.errors.description.message}
            </span>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit">Salvează</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}