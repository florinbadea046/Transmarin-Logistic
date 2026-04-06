// A37. Cheltuieli Recurente Transport — KPI Cards

import { useTranslation } from "react-i18next";
import { DollarSign, CheckCircle2, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { RecurringExpense } from "./recurring-expenses-utils";

// ── KPI Cards ──────────────────────────────────────────────

export function KpiCards({ expenses }: { expenses: RecurringExpense[] }) {
  const { t } = useTranslation();

  const totalLuna = expenses.reduce((s, e) => s + e.monthlyAmount, 0);
  const platit = expenses.filter((e) => e.status === "platit").reduce((s, e) => s + e.monthlyAmount, 0);
  const restant = expenses.filter((e) => e.status === "neplatit").reduce((s, e) => s + e.monthlyAmount, 0);

  return (
    <div className="grid gap-4 mb-6 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.totalMonth")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLuna.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.totalMonthDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.paid")}</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{platit.toLocaleString("ro-RO")} RON</div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.paidDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("recurringExpenses.kpi.unpaid")}</CardTitle>
          <AlertTriangle className={cn("h-4 w-4", restant > 0 ? "text-red-500" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", restant > 0 ? "text-red-600 dark:text-red-400" : "")}>
            {restant.toLocaleString("ro-RO")} RON
          </div>
          <p className="text-xs text-muted-foreground">{t("recurringExpenses.kpi.unpaidDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
