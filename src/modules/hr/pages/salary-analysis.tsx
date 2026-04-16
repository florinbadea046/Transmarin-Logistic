// C21 — Comparație Salarială & Buget HR
// Analiză salarii pe departamente + evoluția fondului lunar.
// Calculează: total salarii, cost bonusuri lună, cost diurnă, cost brut.
// Input buget maxim lunar → alertă roșu dacă costul depășește pragul.

import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, TrendingUp, Users, Wallet } from "lucide-react";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatCurrency, getDateLocale } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Bonus, Employee } from "@/modules/hr/types";

const BUDGET_STORAGE_KEY = "transmarin_hr_salary_budget";
const MONTH_KEY_FORMAT = "yyyy-MM";
const HISTORY_MONTHS = 6;

// ── Helpers ────────────────────────────────────────────────

function monthKey(date: Date): string {
  return format(date, MONTH_KEY_FORMAT);
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const label = format(d, "LLL yyyy", { locale: getDateLocale() });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isBonusInMonth(bonus: Bonus, key: string): boolean {
  return bonus.date?.startsWith(key);
}

function loadBudget(): number {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

function saveBudget(value: number) {
  localStorage.setItem(BUDGET_STORAGE_KEY, String(value));
}

// ── Page ───────────────────────────────────────────────────

export default function SalaryAnalysisPage() {
  const { t } = useTranslation();
  const [employees] = useState<Employee[]>(() => getCollection<Employee>(STORAGE_KEYS.employees));
  const [bonuses] = useState<Bonus[]>(() => getCollection<Bonus>(STORAGE_KEYS.bonuses));
  const [budget, setBudget] = useState<number>(loadBudget);

  useEffect(() => {
    saveBudget(budget);
  }, [budget]);

  const currentMonth = monthKey(new Date());

  // ── Per-departament ────────────────────────────────────
  const departmentRows = useMemo(() => {
    const byDept = new Map<string, Employee[]>();
    for (const emp of employees) {
      const list = byDept.get(emp.department) ?? [];
      list.push(emp);
      byDept.set(emp.department, list);
    }
    return Array.from(byDept.entries())
      .map(([department, list]) => {
        const salaries = list.map((e) => e.salary ?? 0);
        const min = salaries.length ? Math.min(...salaries) : 0;
        const max = salaries.length ? Math.max(...salaries) : 0;
        const total = salaries.reduce((s, n) => s + n, 0);
        const avg = salaries.length ? total / salaries.length : 0;
        return {
          department,
          count: list.length,
          min,
          max,
          avg,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [employees]);

  // ── KPI pe luna curenta ────────────────────────────────
  const kpi = useMemo(() => {
    const totalSalaries = employees.reduce((s, e) => s + (e.salary ?? 0), 0);
    let bonusAmount = 0;
    let diurnaAmount = 0;
    let fines = 0;
    for (const b of bonuses) {
      if (!isBonusInMonth(b, currentMonth)) continue;
      if (b.type === "diurna") diurnaAmount += b.amount;
      else if (b.type === "amenda") fines += b.amount;
      else bonusAmount += b.amount;
    }
    const grossTotal = totalSalaries + bonusAmount + diurnaAmount - fines;
    return { totalSalaries, bonusAmount, diurnaAmount, fines, grossTotal };
  }, [employees, bonuses, currentMonth]);

  // ── Evolutie fond salarii pe ultimele 6 luni ───────────
  const historyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: HISTORY_MONTHS }, (_, i) => {
      const d = subMonths(now, HISTORY_MONTHS - 1 - i);
      const key = monthKey(d);
      let bonusSum = 0;
      let diurnaSum = 0;
      let finesSum = 0;
      for (const b of bonuses) {
        if (!isBonusInMonth(b, key)) continue;
        if (b.type === "diurna") diurnaSum += b.amount;
        else if (b.type === "amenda") finesSum += b.amount;
        else bonusSum += b.amount;
      }
      const gross = kpi.totalSalaries + bonusSum + diurnaSum - finesSum;
      return {
        key,
        label: formatMonthLabel(key),
        [t("salaryAnalysis.history.gross")]: Math.round(gross),
      };
    });
  }, [bonuses, kpi.totalSalaries, t]);

  // ── Chart data per departament ─────────────────────────
  const chartData = useMemo(
    () =>
      departmentRows.map((r) => ({
        department: r.department,
        [t("salaryAnalysis.chart.min")]: r.min,
        [t("salaryAnalysis.chart.avg")]: Math.round(r.avg),
        [t("salaryAnalysis.chart.max")]: r.max,
      })),
    [departmentRows, t],
  );

  const overBudget = budget > 0 && kpi.grossTotal > budget;

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("salaryAnalysis.title")}</h1>
      </Header>

      <Main className="space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Wallet className="h-4 w-4 text-blue-500" />}
            label={t("salaryAnalysis.kpi.totalSalaries")}
            value={formatCurrency(kpi.totalSalaries)}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            label={t("salaryAnalysis.kpi.bonusesMonth")}
            value={formatCurrency(kpi.bonusAmount)}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4 text-yellow-500" />}
            label={t("salaryAnalysis.kpi.diurnaMonth")}
            value={formatCurrency(kpi.diurnaAmount)}
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4 text-foreground" />}
            label={t("salaryAnalysis.kpi.grossTotal")}
            value={formatCurrency(kpi.grossTotal)}
            highlight={overBudget}
          />
        </div>

        {/* Budget alert */}
        <Card className={cn(overBudget && "border-red-500/40")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">
                {t("salaryAnalysis.budget.title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("salaryAnalysis.budget.subtitle")}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="hr-budget" className="text-xs text-muted-foreground">
                  {t("salaryAnalysis.budget.input")}
                </Label>
                <Input
                  id="hr-budget"
                  type="number"
                  min={0}
                  step={100}
                  value={budget || ""}
                  onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  className="w-40"
                  placeholder="0"
                />
              </div>
            </div>
          </CardHeader>
          {overBudget && (
            <CardContent className="pt-0">
              <Badge variant="destructive" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("salaryAnalysis.budget.overAlert", {
                  over: formatCurrency(kpi.grossTotal - budget),
                })}
              </Badge>
            </CardContent>
          )}
        </Card>

        {/* BarChart salarii departament */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("salaryAnalysis.chart.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("salaryAnalysis.empty")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                  <ChartTooltip formatter={(val) => [formatCurrency(Number(val))]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={t("salaryAnalysis.chart.min")} fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t("salaryAnalysis.chart.avg")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t("salaryAnalysis.chart.max")} fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* LineChart evolutie fond salarii */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("salaryAnalysis.history.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <ChartTooltip formatter={(val) => [formatCurrency(Number(val))]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey={t("salaryAnalysis.history.gross")}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabel departament */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("salaryAnalysis.table.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("salaryAnalysis.table.department")}</TableHead>
                    <TableHead className="text-right">{t("salaryAnalysis.table.count")}</TableHead>
                    <TableHead className="text-right">{t("salaryAnalysis.table.avg")}</TableHead>
                    <TableHead className="text-right">{t("salaryAnalysis.table.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {t("salaryAnalysis.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    departmentRows.map((row) => (
                      <TableRow key={row.department}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.department}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(row.avg)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {departmentRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("salaryAnalysis.empty")}</p>
              ) : (
                departmentRows.map((row) => (
                  <div key={row.department} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{row.department}</p>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-muted-foreground">{t("salaryAnalysis.table.avg")}</span>
                      <span className="text-right tabular-nums">{formatCurrency(row.avg)}</span>
                      <span className="text-muted-foreground">{t("salaryAnalysis.table.total")}</span>
                      <span className="text-right tabular-nums font-medium">{formatCurrency(row.total)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────

function KpiCard({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-red-500/40")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-red-500")}>{value}</p>
      </CardContent>
    </Card>
  );
}
