import type { Bonus } from "@/modules/hr/types";

export const BONUS_TYPE_KEYS: Record<Bonus["type"], string> = {
  diurna: "hr.payroll.typeDiurna",
  bonus: "hr.payroll.typeBonus",
  amenda: "hr.payroll.typeFine",
  ore_suplimentare: "hr.payroll.typeOvertime",
};

/** @deprecated Use BONUS_TYPE_KEYS with t() instead */
export const BONUS_TYPE_LABELS: Record<Bonus["type"], string> = {
  diurna: "Diurnă",
  bonus: "Bonus",
  amenda: "Amendă",
  ore_suplimentare: "Ore suplimentare",
};

export type PayrollRow = {
  id: string;
  name: string;
  department: string;
  salary: number;
  diurna: number;
  bonusuri: number;
  amenzi: number;
  oreSuplimentare: number;
  totalNet: number;
};

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ro-RO", {
      month: "long",
      year: "numeric",
    });
    options.push({ value, label });
  }

  return options;
}

export const MONTH_OPTIONS = getMonthOptions();

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
