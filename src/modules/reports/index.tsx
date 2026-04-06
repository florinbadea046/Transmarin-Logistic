import { useMemo, type ElementType } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, FileWarning, Truck, Users, Route,
} from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import type { Order, Trip, Truck as TruckType } from "@/modules/transport/types";
import type { ServiceRecord, FuelRecord } from "@/modules/fleet/types";
import type { Employee } from "@/modules/hr/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const PIE_COLORS = ["#f59e0b", "#3b82f6"];
const TARIF_PER_KM = 2;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);

function KpiCard({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: string;
  icon: ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg shrink-0 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
        </div>
        <p className="text-lg font-bold leading-tight break-all">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>
  );
}

export default function ReportsDashboardPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);
  const orders = useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);
  const trips = useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const trucks = useMemo(() => getCollection<TruckType>(STORAGE_KEYS.trucks), []);
  const serviceRecords = useMemo(() => getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords), []);
  const fuelRecords = useMemo(() => getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords), []);
  const employees = useMemo(() => getCollection<Employee>(STORAGE_KEYS.employees), []);

  const totalVenituri = useMemo(() =>
    invoices.filter((i) => i.type === "income").reduce((s, i) => s + i.total, 0), [invoices]);
  const totalCheltuieli = useMemo(() =>
    invoices.filter((i) => i.type === "expense").reduce((s, i) => s + i.total, 0), [invoices]);
  const profitabilitate = totalVenituri - totalCheltuieli;
  const nrNeplatite = useMemo(() =>
    invoices.filter((i) => i.status === "overdue" || i.status === "sent").length, [invoices]);
  const nrCurse = useMemo(() => trips.length, [trips]);
  const nrAngajati = useMemo(() => employees.length, [employees]);

  const top3Trucks = useMemo(() => {
    return trucks.map((truck) => {
      const serviceCost = serviceRecords.filter((r) => r.truckId === truck.id).reduce((s, r) => s + r.cost, 0);
      const fuelCost = fuelRecords.filter((r) => r.truckId === truck.id).reduce((s, r) => s + r.cost, 0);
      return { ...truck, serviceCost, fuelCost, totalCost: serviceCost + fuelCost };
    })
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 3);
  }, [trucks, serviceRecords, fuelRecords]);

  const top3Clients = useMemo(() => {
    const map: Record<string, { name: string; venit: number; nrComenzi: number }> = {};
    orders.forEach((order) => {
      const orderTrips = trips.filter((t) => t.orderId === order.id);
      const venit = orderTrips.reduce((s, t) => s + t.kmLoaded * TARIF_PER_KM, 0);
      if (!map[order.clientName]) map[order.clientName] = { name: order.clientName, venit: 0, nrComenzi: 0 };
      map[order.clientName].venit += venit;
      map[order.clientName].nrComenzi += 1;
    });
    return Object.values(map).sort((a, b) => b.venit - a.venit).slice(0, 3);
  }, [orders, trips]);

  const barData = useMemo(() => {
    const map: Record<string, { luna: string; venituri: number; cheltuieli: number }> = {};
    invoices.forEach((inv) => {
      const luna = inv.date.substring(0, 7);
      if (!map[luna]) map[luna] = { luna, venituri: 0, cheltuieli: 0 };
      if (inv.type === "income") map[luna].venituri += inv.total;
      else map[luna].cheltuieli += inv.total;
    });
    return Object.values(map)
      .sort((a, b) => a.luna.localeCompare(b.luna))
      .slice(-6)
      .map((r) => ({ ...r, luna: r.luna.slice(5) }));
  }, [invoices]);

  const kmData = useMemo(() => {
    const map: Record<string, number> = {};
    trips.forEach((tr) => {
      const luna = tr.departureDate.substring(0, 7);
      map[luna] = (map[luna] ?? 0) + tr.kmLoaded + tr.kmEmpty;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([luna, km]) => ({ luna: luna.slice(5), km }));
  }, [trips]);

  const totalFleetFuel = useMemo(() => fuelRecords.reduce((s, r) => s + r.cost, 0), [fuelRecords]);
  const totalFleetService = useMemo(() => serviceRecords.reduce((s, r) => s + r.cost, 0), [serviceRecords]);

  const pieData = useMemo(() => [
    { name: t("reportsDashboard.fuel"), value: totalFleetFuel },
    { name: t("reportsDashboard.service"), value: totalFleetService },
  ], [t, totalFleetFuel, totalFleetService]);

  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter((i) => i.type === "income").forEach((i) => {
      const luna = i.date.substring(0, 7);
      map[luna] = (map[luna] ?? 0) + i.total;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([luna, venituri]) => ({ luna: luna.slice(5), venituri: Math.round(venituri) }));
  }, [invoices]);

  const rankBadge = (i: number) =>
    i === 0 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border"
    : i === 1 ? "bg-slate-400/20 text-slate-300 border-slate-400/30 border"
    : "bg-orange-700/20 text-orange-400 border-orange-700/30 border";

  const topNavLinks = [
    { title: t("sidebar.reports.transport"), href: "/reports/transport", isActive: pathname === "/reports/transport" },
    { title: t("sidebar.reports.financial"), href: "/reports/financial", isActive: pathname === "/reports/financial" },
    { title: t("sidebar.reports.fleet"), href: "/reports/fleet", isActive: pathname === "/reports/fleet" },
  ];

  const noData = <Empty label={t("reportsDashboard.noData")} />;

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            title={t("reportsDashboard.totalIncome")}
            value={formatCurrency(totalVenituri)}
            icon={TrendingUp}
            color="bg-green-500/10 text-green-400"
          />
          <KpiCard
            title={t("reportsDashboard.totalExpenses")}
            value={formatCurrency(totalCheltuieli)}
            icon={TrendingDown}
            color="bg-red-500/10 text-red-400"
          />
          <KpiCard
            title={t("reportsDashboard.balance")}
            value={formatCurrency(profitabilitate)}
            icon={Wallet}
            color={profitabilitate >= 0 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}
            subtitle={totalVenituri > 0 ? `${((profitabilitate / totalVenituri) * 100).toFixed(1)}% ${t("reportsDashboard.margin")}` : undefined}
          />
          <KpiCard
            title={t("reportsDashboard.unpaidInvoices")}
            value={String(nrNeplatite)}
            icon={FileWarning}
            color="bg-orange-500/10 text-orange-400"
            subtitle={t("reportsDashboard.unpaidSubtitle")}
          />
          <KpiCard
            title={t("reportsDashboard.trips")}
            value={String(nrCurse)}
            icon={Route}
            color="bg-purple-500/10 text-purple-400"
            subtitle={`${trips.filter((tr) => tr.status === "finalizata").length} ${t("reportsDashboard.completed")}`}
          />
          <KpiCard
            title={t("reportsDashboard.employees")}
            value={String(nrAngajati)}
            icon={Users}
            color="bg-cyan-500/10 text-cyan-400"
          />
        </div>

        {/* Top 3 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4 text-muted-foreground" />
                {t("reportsDashboard.top3Trucks")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Trucks.length === 0 ? noData : top3Trucks.map((truck, i) => (
                <div key={truck.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`${rankBadge(i)} text-xs shrink-0`}>#{i + 1}</Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{truck.plateNumber}</p>
                      <p className="text-xs text-muted-foreground">{truck.brand} {truck.model}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-9 sm:pl-0">
                    <p className="font-bold text-sm">{formatCurrency(truck.totalCost)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(truck.fuelCost)} {t("reportsDashboard.fuel")}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users className="w-4 h-4 text-muted-foreground" />
                {t("reportsDashboard.top3Clients")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Clients.length === 0 ? noData : top3Clients.map((client, i) => (
                <div key={client.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`${rankBadge(i)} text-xs shrink-0`}>#{i + 1}</Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.nrComenzi} {client.nrComenzi === 1 ? t("reportsDashboard.order") : t("reportsDashboard.orders")}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-sm shrink-0 pl-9 sm:pl-0">{formatCurrency(client.venit)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* BarChart + LineChart */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("reportsDashboard.incomeVsExpenses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length === 0 ? noData : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => [formatCurrency(Number(val))]} labelFormatter={(l) => `${t("reportsDashboard.month")} ${l}`} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="venituri" name={t("reportsDashboard.income")} fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cheltuieli" name={t("reportsDashboard.expenses")} fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("reportsDashboard.kmChart")}</CardTitle>
            </CardHeader>
            <CardContent>
              {kmData.length === 0 ? noData : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={kmData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `${v.toLocaleString("ro-RO")}`} />
                    <Tooltip formatter={(val) => [`${Number(val).toLocaleString("ro-RO")} km`, t("reportsDashboard.kmTooltip")]} labelFormatter={(l) => `${t("reportsDashboard.month")} ${l}`} />
                    <Line type="monotone" dataKey="km" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PieChart + AreaChart */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("reportsDashboard.fleetExpenses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {totalFleetFuel === 0 && totalFleetService === 0 ? noData : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData} dataKey="value" nameKey="name"
                      cx="50%" cy="45%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => [formatCurrency(Number(val))]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("reportsDashboard.revenueTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              {areaData.length === 0 ? noData : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradVenituri" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => [formatCurrency(Number(val)), t("reportsDashboard.income")]} labelFormatter={(l) => `${t("reportsDashboard.month")} ${l}`} />
                    <Area type="monotone" dataKey="venituri" name={t("reportsDashboard.income")} stroke={COLORS[1]} strokeWidth={2} fill="url(#gradVenituri)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
