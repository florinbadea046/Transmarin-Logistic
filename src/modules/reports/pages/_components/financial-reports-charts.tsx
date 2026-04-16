import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { COLORS, formatCurrency } from "./financial-reports-utils";

// ── FinancialCharts ───────────────────────────────────────
export interface FinancialChartsProps {
  barData: { luna: string; venituri: number; cheltuieli: number }[];
  pieData: { name: string; value: number }[];
  isMobile: boolean;
}

export function FinancialCharts({ barData, pieData, isMobile }: FinancialChartsProps) {
  const { t } = useTranslation();
  const chartH = isMobile ? 200 : 260;

  return (
    <div className={cn("grid gap-6 mb-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>

      {/* BarChart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("financialReports.charts.incomeVsExpenses")}</CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0
            ? <p className="py-10 text-center text-sm text-muted-foreground">{t("financialReports.noResults")}</p>
            : (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="luna" tick={{ fontSize: isMobile ? 10 : 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 45 : 60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip formatter={(val) => [formatCurrency(val as number)]} />
                  <Legend wrapperStyle={{ fontSize: isMobile ? "10px" : "11px" }} />
                  <Bar dataKey="venituri" name={t("financialReports.typeIncome")} fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cheltuieli" name={t("financialReports.typeExpense")} fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </CardContent>
      </Card>

      {/* PieChart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("financialReports.charts.expenseBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0
            ? <p className="py-10 text-center text-sm text-muted-foreground">{t("financialReports.noResults")}</p>
            : (
              <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy={isMobile ? "38%" : "32%"}
                    outerRadius={isMobile ? 60 : 75}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip formatter={(val) => [formatCurrency(val as number)]} />
                  <Legend
                    iconSize={8} layout="vertical" align="center" verticalAlign="bottom"
                    wrapperStyle={{ fontSize: isMobile ? "10px" : "11px", lineHeight: "1.6", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
