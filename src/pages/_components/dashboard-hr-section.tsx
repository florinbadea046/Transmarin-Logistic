import { useTranslation } from "react-i18next";
import {
  Users, CalendarOff, FileWarning, Clock, UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import { cn } from "@/lib/utils";
import { padTwo, daysUntil, formatDateRO } from "./dashboard-utils";

// ── HR Section (NEATINS) ───────────────────────────────────

export function HRSection({ employees, leaveRequests }: {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
}) {
  const { t } = useTranslation();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;

  const totalEmployees = employees.length;

  const onLeaveThisMonth = leaveRequests.filter((lr) => {
    if (lr.status !== "approved") return false;
    return lr.startDate.startsWith(thisMonth) || lr.endDate.startsWith(thisMonth);
  }).length;

  const expiredDocs: { employeeName: string; docName: string; expiryDate: string }[] = [];
  for (const emp of employees) {
    for (const doc of emp.documents) {
      if (!doc.expiryDate) continue;
      if (daysUntil(doc.expiryDate) < 0) {
        expiredDocs.push({ employeeName: emp.name, docName: doc.name, expiryDate: doc.expiryDate });
      }
    }
  }

  const pendingLeaves = leaveRequests.filter((lr) => lr.status === "pending").length;

  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    last6Months.push(`${d.getFullYear()}-${padTwo(d.getMonth() + 1)}`);
  }
  const months = t("dashboard.months", { returnObjects: true }) as string[];
  const newEmployeesData = last6Months.map((ym) => {
    const [year, month] = ym.split("-");
    const count = employees.filter((e) => e.hireDate?.startsWith(ym)).length;
    return {
      luna: `${months[parseInt(month) - 1]} ${year.slice(2)}`,
      angajati: count,
    };
  });

  const hrCards = [
    {
      title: t("hrDashboard.cards.totalEmployees"),
      value: totalEmployees,
      desc: t("hrDashboard.cards.totalEmployeesDesc"),
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: t("hrDashboard.cards.onLeave"),
      value: onLeaveThisMonth,
      desc: t("hrDashboard.cards.onLeaveDesc"),
      icon: <CalendarOff className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: t("hrDashboard.cards.expiredDocs"),
      value: expiredDocs.length,
      desc: t("hrDashboard.cards.expiredDocsDesc"),
      icon: <FileWarning className="h-4 w-4 text-muted-foreground" />,
      alert: expiredDocs.length > 0,
    },
    {
      title: t("hrDashboard.cards.pendingLeaves"),
      value: pendingLeaves,
      desc: t("hrDashboard.cards.pendingLeavesDesc"),
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      alert: pendingLeaves > 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">{t("hrDashboard.title")}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hrCards.map(({ title, value, desc, icon, alert }) => (
          <Card key={title} className={alert ? "border-red-200 dark:border-red-800" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={cn("text-sm font-medium",
                alert ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                {title}
              </CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold",
                alert ? "text-red-600 dark:text-red-400" : "")}>{value}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("hrDashboard.charts.newEmployees")}</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <ResponsiveContainer width="100%" height={200} minWidth={0}>
              <BarChart data={newEmployeesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="luna" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <ChartTooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, t("hrDashboard.charts.newEmployeesTooltip")]} />
                <Bar dataKey="angajati" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {expiredDocs.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                  <FileWarning className="h-4 w-4" />
                  {t("hrDashboard.alerts.expiredDocs")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                  {expiredDocs.map((d, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{d.employeeName}</span>
                      <span className="text-muted-foreground truncate">{d.docName}</span>
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        {formatDateRO(d.expiryDate)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {pendingLeaves > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  <Clock className="h-4 w-4" />
                  {t("hrDashboard.alerts.pendingLeaves")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                  {leaveRequests.filter((lr) => lr.status === "pending").map((lr) => {
                    const emp = employees.find((e) => e.id === lr.employeeId);
                    return (
                      <li key={lr.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium truncate">{emp?.name ?? lr.employeeId}</span>
                        <span className="text-muted-foreground shrink-0">
                          {formatDateRO(lr.startDate)} — {formatDateRO(lr.endDate)}
                        </span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{t("hrDashboard.alerts.days", { count: lr.days })}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {expiredDocs.length === 0 && pendingLeaves === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {t("hrDashboard.alerts.allGood")}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
