// A37. Cheltuieli Recurente Transport — StatusBadge + Mobile Card

import { Pencil, Trash2, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { RecurringExpense, RecurringStatus } from "./recurring-expenses-utils";
import type { Truck } from "@/modules/transport/types";

// ── Status Badge ───────────────────────────────────────────

export function StatusBadge({ status, t }: { status: RecurringStatus; t: (k: string) => string }) {
  return (
    <Badge variant="outline" className={cn(
      "whitespace-nowrap",
      status === "platit"
        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
    )}>
      {t(`recurringExpenses.status.${status}`)}
    </Badge>
  );
}

// ── Mobile Card ────────────────────────────────────────────

export function ExpenseMobileCard({ expense, truck, onEdit, onDelete, onMarkPaid, t }: {
  expense: RecurringExpense;
  truck?: Truck;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{t(`recurringExpenses.categories.${expense.category}`)}</p>
          <p className="text-xs text-muted-foreground">{truck?.plateNumber ?? expense.truckId}</p>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge status={expense.status} t={t} />
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="text-foreground font-medium">{expense.monthlyAmount.toLocaleString("ro-RO")} RON</span>
        <span>{t("recurringExpenses.fields.nextPaymentDate")}: <span className="text-foreground">{expense.nextPaymentDate}</span></span>
        <span className="truncate">{expense.description}</span>
      </div>
      {expense.status === "neplatit" && (
        <Button size="sm" variant="outline" onClick={onMarkPaid} className="w-full mt-1 border-green-500 text-green-700 dark:text-green-400 hover:bg-green-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
          {t("recurringExpenses.actions.markPaid")}
        </Button>
      )}
    </div>
  );
}
