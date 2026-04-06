// A37. Cheltuieli Recurente Transport — Types, schema, constants

import { z } from "zod";

// ── Tipuri ─────────────────────────────────────────────────

export type RecurringCategory =
  | "asigurare"
  | "leasing"
  | "taxe"
  | "parcare"
  | "altele";

export type RecurringStatus = "platit" | "neplatit";

export interface RecurringExpense {
  id: string;
  category: RecurringCategory;
  truckId: string;
  description: string;
  monthlyAmount: number;
  nextPaymentDate: string;  // yyyy-MM-dd
  status: RecurringStatus;
  notes?: string;
}

// ── Zod schema ─────────────────────────────────────────────

export const expenseSchema = z.object({
  category: z.enum(["asigurare", "leasing", "taxe", "parcare", "altele"]),
  truckId: z.string().min(1),
  description: z.string().min(2),
  monthlyAmount: z.number({ message: "Suma invalida" }).positive(),
  nextPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  status: z.enum(["platit", "neplatit"]),
  notes: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormData, string>>;

export const EMPTY_FORM: ExpenseFormData = {
  category: "asigurare",
  truckId: "",
  description: "",
  monthlyAmount: 0,
  nextPaymentDate: "",
  status: "neplatit",
  notes: "",
};

// ── Culori PieChart ────────────────────────────────────────

export const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
