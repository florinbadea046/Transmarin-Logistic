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
import { DatePicker } from "@/components/date-picker";
import type { Employee, Bonus } from "@/modules/hr/types";
import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { BONUS_TYPE_LABELS } from "./payroll-columns";

const todayStr = () => new Date().toISOString().slice(0, 10);

const bonusSchema = z.object({
  employeeId: z.string().min(1, "Selectați un angajat"),
  type: z.enum(["diurna", "bonus", "amenda", "ore_suplimentare"]),
  amount: z.number().min(0.01, "Suma trebuie să fie pozitivă"),
  date: z.string().min(1, "Data este obligatorie"),
  description: z.string().min(5, "Motivul trebuie să aibă minim 5 caractere"),
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

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    bonus?.date ? new Date(bonus.date) : new Date(),
  );

  const form = useForm<BonusFormValues>({
    resolver: zodResolver(bonusSchema),
    defaultValues: {
      employeeId: bonus?.employeeId ?? "",
      type: bonus?.type ?? "bonus",
      amount: bonus?.amount ? Math.abs(bonus.amount) : 0,
      date: bonus?.date ?? todayStr(),
      description: bonus?.description ?? "",
    },
  });

  const employeeId = useWatch({ control: form.control, name: "employeeId" });
  const type = useWatch({ control: form.control, name: "type" });

  React.useEffect(() => {
    if (open) {
      form.reset({
        employeeId: bonus?.employeeId ?? "",
        type: bonus?.type ?? "bonus",
        amount: bonus?.amount ? Math.abs(bonus.amount) : 0,
        date: bonus?.date ?? todayStr(),
        description: bonus?.description ?? "",
      });
      setSelectedDate(bonus?.date ? new Date(bonus.date) : new Date());
    }
  }, [open, bonus, form]);

  const handleSubmit = (values: BonusFormValues) => {
    const amount = values.type === "amenda" ? -Math.abs(values.amount) : Math.abs(values.amount);
    const data = { ...values, amount };
    if (isEdit && bonus) {
      updateItem<Bonus>(
        STORAGE_KEYS.bonuses,
        (b) => b.id === bonus.id,
        () => ({ ...bonus, ...data }),
      );
    } else {
      addItem<Bonus>(STORAGE_KEYS.bonuses, { ...data, id: generateId() });
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
              form.setValue("type", val as Bonus["type"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(BONUS_TYPE_LABELS) as [Bonus["type"], string][]
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
            placeholder="Sumă (RON)"
            {...form.register("amount", { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <span className="text-xs text-red-500">
              {form.formState.errors.amount.message}
            </span>
          )}

          <div className="[&>button]:w-full">
            <DatePicker
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