// A37. Cheltuieli Recurente Transport — PieChart distributie categorii

import { useTranslation } from "react-i18next";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { RecurringExpense } from "./recurring-expenses-utils";
import { PIE_COLORS } from "./recurring-expenses-utils";

// ── PieChart distributie ───────────────────────────────────

export function CategoryChart({ expenses }: { expenses: RecurringExpense[] }) {
  const { t } = useTranslation();
  if (expenses.length === 0) return null;

  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.monthlyAmount;
  }
  const data = Object.entries(catMap).map(([cat, value]) => ({
    name: t(`recurringExpenses.categories.${cat}`),
    value,
  }));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("recurringExpenses.chart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <ChartTooltip formatter={(val) => [`${Number(val).toLocaleString("ro-RO")} RON`]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
