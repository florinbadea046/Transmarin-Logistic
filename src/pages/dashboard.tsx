import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Users, Receipt, BarChart3, AlertTriangle, PackageCheck,
  UserCheck, CalendarOff, FileWarning, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Truck as TruckType } from "@/modules/transport/types";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

type RawTrip = {
  id: string; orderId: string; driverId: string; truckId: string;
  date?: string; departureDate?: string;
  kmLoaded: number; kmEmpty: number; fuelCost: number; status: string;
};

// ── Helpers ────────────────────────────────────────────────

function getTripDate(t: RawTrip): string {
  return t.departureDate || t.date || "";
}

function padTwo(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function buildLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(toYMD(d));
  }
  return days;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${dateStr}T00:00:00`).getTime() - today.getTime()) / 86400000);
}

function formatDateRO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}

// ── Data hooks ─────────────────────────────────────────────

function useTransportData() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [trips, setTrips] = React.useState<RawTrip[]>([]);
  const [trucks, setTrucks] = React.useState<TruckType[]>([]);
  React.useEffect(() => {
    try { setOrders(getCollection<Order>(STORAGE_KEYS.orders)); } catch (_) { void _; }
    try { setTrips(getCollection<RawTrip>(STORAGE_KEYS.trips)); } catch (_) { void _; }
    try { setTrucks(getCollection<TruckType>(STORAGE_KEYS.trucks)); } catch (_) { void _; }
  }, []);
  return { orders, trips, trucks };
}

function useHRData() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
  React.useEffect(() => {
    try { setEmployees(getCollection<Employee>(STORAGE_KEYS.employees)); } catch (_) { void _; }
    try { setLeaveRequests(getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests)); } catch (_) { void _; }
  }, []);
  return { employees, leaveRequests };
}

// ── Transport Alerts ───────────────────────────────────────

function AlerteTransport({ trucks }: { trucks: TruckType[] }) {
  const { t } = useTranslation();
  const nowMs = new Date().getTime();
  const alerts: { label: string; daysLeft: number }[] = [];
  for (const truck of trucks) {
    const checks = [
      { field: truck.itpExpiry, type: "ITP" },
      { field: truck.rcaExpiry, type: "RCA" },
      { field: truck.vignetteExpiry, type: t("trucks.card.vignette") },
    ];
    for (const { field, type } of checks) {
      if (!field) continue;
      try {
        const daysLeft = Math.ceil((new Date(field).getTime() - nowMs) / 86400000);
        if (daysLeft < 30) {
          const status = daysLeft < 0
            ? t("dashboard.alerts.expired")
            : t("dashboard.alerts.expiresIn", { days: daysLeft });
          alerts.push({ label: `${truck.plateNumber} — ${type} ${status}`, daysLeft });
        }
      } catch (_) { void _; }
    }
  }
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  if (alerts.length === 0) return null;
  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          {t("dashboard.alerts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full shrink-0",
                a.daysLeft < 0 ? "bg-red-500" : a.daysLeft < 7 ? "bg-orange-400" : "bg-yellow-400")} />
              <span className={a.daysLeft < 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                {a.label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── HR Section ─────────────────────────────────────────────

function HRSection({ employees, leaveRequests }: {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
}) {
  const { t } = useTranslation();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;

  // Card 1: Total angajati
  const totalEmployees = employees.length;

  // Card 2: In concediu luna curenta (approved, overlap cu luna curenta)
  const onLeaveThisMonth = leaveRequests.filter((lr) => {
    if (lr.status !== "approved") return false;
    return lr.startDate.startsWith(thisMonth) || lr.endDate.startsWith(thisMonth);
  }).length;

  // Card 3: Documente expirate (expiryDate < azi)
  const expiredDocs: { employeeName: string; docName: string; expiryDate: string }[] = [];
  for (const emp of employees) {
    for (const doc of emp.documents) {
      if (!doc.expiryDate) continue;
      if (daysUntil(doc.expiryDate) < 0) {
        expiredDocs.push({ employeeName: emp.name, docName: doc.name, expiryDate: doc.expiryDate });
      }
    }
  }

  // Card 4: Cereri in asteptare
  const pendingLeaves = leaveRequests.filter((lr) => lr.status === "pending").length;

  // Grafic: angajati noi pe luna ultimele 6 luni
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

      {/* 4 carduri HR */}
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

      {/* Grafic + Alerte */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Grafic angajati noi per luna */}
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
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, t("hrDashboard.charts.newEmployeesTooltip")]} />
                <Bar dataKey="angajati" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alerte HR */}
        <div className="space-y-3">
          {/* Documente expirate */}
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

          {/* Cereri neaprobate */}
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
                        <Badge variant="secondary" className="text-[10px] shrink-0">{lr.days}z</Badge>
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

// ── Dashboard Page ─────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();
  const { orders, trips, trucks } = useTransportData();
  const { employees, leaveRequests } = useHRData();

  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}`;

  const activeOrders = orders.filter((o) =>
    o.status === "pending" || o.status === "assigned" || o.status === "in_transit",
  ).length;

  const kmMonth = trips
    .filter((trip) => getTripDate(trip).startsWith(thisMonth))
    .reduce((sum, trip) => sum + (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0), 0);

  const months = t("dashboard.months", { returnObjects: true }) as string[];
  function shortLabel(ymd: string): string {
    const parts = ymd.split("-");
    if (parts.length < 3) return ymd;
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
  }

  const days30 = buildLast30Days();
  const kmByDay: Record<string, number> = {};
  for (const d of days30) kmByDay[d] = 0;
  for (const trip of trips) {
    const key = getTripDate(trip).slice(0, 10);
    if (key in kmByDay) kmByDay[key] += (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0);
  }
  const chartData = days30.map((d) => ({ date: shortLabel(d), km: kmByDay[d] }));

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("dashboard.title")}</h1>
      </Header>
      <Main>
        <div className="space-y-8">
          <AlerteTransport trucks={trucks} />

          {/* Sectiunea Transport */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.cards.activeOrders")}</CardTitle>
                  <PackageCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeOrders}</div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.cards.activeOrdersDesc")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.cards.employees")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employees.length}</div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.cards.employeesDesc")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.cards.invoices")}</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length}</div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.cards.invoicesDesc")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.cards.kmMonth")}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kmMonth.toLocaleString()} km</div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.cards.kmMonthDesc")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{t("dashboard.charts.kmPerDay")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`${v ?? 0} km`, t("dashboard.charts.kmTooltip")]} />
                      <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.charts.costsVsRevenue")}</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[220px] items-center justify-center text-muted-foreground">
                  <p>{t("dashboard.charts.costsVsRevenueTodo")}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Sectiunea HR */}
          <HRSection employees={employees} leaveRequests={leaveRequests} />
        </div>
      </Main>
    </>
  );
}