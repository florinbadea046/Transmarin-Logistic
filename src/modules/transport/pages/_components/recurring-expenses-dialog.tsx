// A37. Cheltuieli Recurente Transport — Dialog CRUD

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { cn } from "@/lib/utils";

import type { RecurringCategory, RecurringStatus, RecurringExpense, ExpenseFormData, ExpenseFormErrors } from "./recurring-expenses-utils";
import { expenseSchema, EMPTY_FORM } from "./recurring-expenses-utils";

// ── Dialog CRUD ────────────────────────────────────────────

export function ExpenseDialog({
  open, onOpenChange, editing, trucks, isMobile, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RecurringExpense | null;
  trucks: Truck[];
  isMobile: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<ExpenseFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<ExpenseFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        category: editing.category,
        truckId: editing.truckId,
        description: editing.description,
        monthlyAmount: editing.monthlyAmount,
        nextPaymentDate: editing.nextPaymentDate,
        status: editing.status,
        notes: editing.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editing]);

  const patch = (p: Partial<ExpenseFormData>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = () => {
    const result = expenseSchema.safeParse(form);
    if (!result.success) {
      const errs: ExpenseFormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ExpenseFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    const data = result.data;
    if (editing) {
      updateItem<RecurringExpense>(
        STORAGE_KEYS.recurringExpenses,
        (e) => e.id === editing.id,
        (e) => ({ ...e, ...data }),
      );
      toast.success(t("recurringExpenses.toastUpdated"));
    } else {
      addItem<RecurringExpense>(STORAGE_KEYS.recurringExpenses, {
        id: generateId(), ...data,
      });
      toast.success(t("recurringExpenses.toastAdded"));
    }
    onSave();
    onOpenChange(false);
  };

  const categories: RecurringCategory[] = ["asigurare", "leasing", "taxe", "parcare", "altele"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex flex-col gap-4", isMobile ? "max-w-[calc(100vw-2rem)] p-4" : "max-w-xl")}>
        <DialogHeader>
          <DialogTitle>{editing ? t("recurringExpenses.edit") : t("recurringExpenses.add")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Categorie */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.category")}</Label>
            <Select value={form.category} onValueChange={(v) => patch({ category: v as RecurringCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{t(`recurringExpenses.categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camion */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.truck")}</Label>
            <Select value={form.truckId} onValueChange={(v) => patch({ truckId: v })}>
              <SelectTrigger><SelectValue placeholder={t("recurringExpenses.placeholders.truck")} /></SelectTrigger>
              <SelectContent>
                {trucks.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>{tr.plateNumber} — {tr.brand} {tr.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truckId && <p className="text-xs text-red-500">{t("recurringExpenses.validation.truckRequired")}</p>}
          </div>

          {/* Descriere */}
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("recurringExpenses.fields.description")}</Label>
            <Input value={form.description} onChange={(e) => patch({ description: e.target.value })}
              placeholder={t("recurringExpenses.placeholders.description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Suma lunara */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.monthlyAmount")}</Label>
            <Input type="number" min={0} value={form.monthlyAmount}
              onChange={(e) => patch({ monthlyAmount: parseFloat(e.target.value) || 0 })} />
            {errors.monthlyAmount && <p className="text-xs text-red-500">{errors.monthlyAmount}</p>}
          </div>

          {/* Data urmatoare plata */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.nextPaymentDate")}</Label>
            <Input type="date" value={form.nextPaymentDate}
              onChange={(e) => patch({ nextPaymentDate: e.target.value })} />
            {errors.nextPaymentDate && <p className="text-xs text-red-500">{errors.nextPaymentDate}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.status")}</Label>
            <Select value={form.status} onValueChange={(v) => patch({ status: v as RecurringStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="neplatit">{t("recurringExpenses.status.neplatit")}</SelectItem>
                <SelectItem value="platit">{t("recurringExpenses.status.platit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label>{t("recurringExpenses.fields.notes")} ({t("recurringExpenses.fields.optional")})</Label>
            <Input value={form.notes} onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t("recurringExpenses.placeholders.notes")} />
          </div>
        </div>

        <DialogFooter className={cn(isMobile && "flex-col gap-2")}>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>
            {t("recurringExpenses.cancel")}
          </Button>
          <Button onClick={handleSubmit} className={cn(isMobile && "w-full")}>
            {editing ? t("recurringExpenses.save") : t("recurringExpenses.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
