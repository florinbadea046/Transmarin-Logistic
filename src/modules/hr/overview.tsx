// ──────────────────────────────────────────────────────────
// MODUL: Resurse Umane — Pagina principală
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, LeaveRequest, Bonus } from "@/modules/hr/types";
import { formatCurrency } from "../../utils/format";
import { DocumentAlerts } from "@/modules/hr/components/document-alerts";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

const DEPT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function HRPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const topNavLinks = [
    { title: t("hr.nav.employees"), href: "/hr/employees", isActive: false },
    { title: t("hr.nav.recruitment"), href: "/hr/recruitment", isActive: false },
    { title: t("hr.nav.leaves"), href: "/hr/leaves", isActive: false },
    { title: t("hr.nav.payroll"), href: "/hr/payroll", isActive: false },
    { title: t("hr.nav.attendance"), href: "/hr/attendance", isActive: false },
    { title: t("hr.nav.shifts"), href: "/hr/shifts", isActive: false },
    { title: t("hr.nav.evaluations"), href: "/hr/evaluations", isActive: false },
    { title: t("hr.nav.trainings"), href: "/hr/trainings", isActive: false },
    { title: t("equipment.title"), href: "/hr/equipment", isActive: false },
    { title: t("hrSettings.nav"), href: "/hr/settings", isActive: false },
  ];

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/hr/employees" && pathname === "/hr"),
  }));

  const alertDays = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.hr_settings);
      if (!raw) return 30;
      return (JSON.parse(raw) as { documentAlertDays?: number }).documentAlertDays ?? 30;
    } catch {
      return 30;
    }
  }, []);

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );
  const leaves = React.useMemo(
    () => getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests),
    [],
  );
  const bonuses = React.useMemo(
    () => getCollection<Bonus>(STORAGE_KEYS.bonuses),
    [],
  );

  const now = React.useMemo(() => new Date(), []);
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const currentMonth = today.slice(0, 7);

  const totalEmployees = employees.length;

  const activeLeavesThisMonth = leaves.filter((l) => {
    if (l.status !== "approved") return false;
    return (
      l.startDate.startsWith(currentMonth) || l.endDate.startsWith(currentMonth)
    );
  }).length;

  const totalBonusesThisMonth = bonuses
    .filter((b) => b.date.startsWith(currentMonth))
    .reduce((sum, b) => {
      const val =
        b.type === "amenda" ? -Math.abs(b.amount) : Math.abs(b.amount);
      return sum + val;
    }, 0);

  const expiredDocs = employees.reduce((count, emp) => {
    const expired = emp.documents.filter(
      (d) => d.expiryDate && d.expiryDate < today,
    ).length;
    return count + expired;
  }, 0);

  const pieData = React.useMemo(() => {
    const deptMap: Record<string, number> = {};
    employees.forEach((e) => {
      deptMap[e.department] = (deptMap[e.department] || 0) + 1;
    });
    return Object.entries(deptMap).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const barData = React.useMemo(() => {
    const months = [...Array(6)].map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleString("ro-RO", { month: "short" }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        bonusuri: 0,
        amenzi: 0,
      };
    });

    bonuses.forEach((b) => {
      const entry = months.find((m) => m.key === b.date.slice(0, 7));
      if (!entry) return;
      if (b.type === "amenda") entry.amenzi += Math.abs(b.amount);
      else entry.bonusuri += Math.abs(b.amount);
    });

    return months;
  }, [bonuses, now]);

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("hr.title")}</h1>
          <p className="text-muted-foreground">{t("hr.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.totalEmployees")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalEmployees}</p>
              <p className="text-sm text-muted-foreground">
                {t("hr.totalEmployeesDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.onLeave")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeLeavesThisMonth}</p>
              <p className="text-sm text-muted-foreground">
                {t("hr.onLeaveDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.expiredDocs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{expiredDocs}</p>
              <p className="text-sm text-muted-foreground">
                {t("hr.expiredDocsDesc")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.totalBonuses")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(totalBonusesThisMonth)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("hr.totalBonusesDesc")}
              </p>
            </CardContent>
          </Card>
        </div>

        <DocumentAlerts employees={employees} alertDays={alertDays} />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.chartDept")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("hr.chartBonuses")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("ro-RO", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(v)
                    }
                  />
                  <ChartTooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Bar
                    dataKey="bonusuri"
                    name={t("hr.chartBonusLabel")}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="amenzi"
                    name={t("hr.chartFinesLabel")}
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

      </Main>
    </>
  );
}
