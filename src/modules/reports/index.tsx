import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, FileWarning, Truck, Users } from "lucide-react";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import type { Order, Trip, Truck as TruckType } from "@/modules/transport/types";
import type { ServiceRecord, FuelRecord } from "@/modules/fleet/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const PIE_COLORS = ["#f59e0b", "#3b82f6"];
const TARIF_PER_KM = 2;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);

function KpiCard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      Nu există date disponibile.
    </p>
  );
}

export default function ReportsDashboardPage() {
  const invoices       = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);
  const orders         = useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);
  const trips          = useMemo(() => getCollection<Trip>(STORAGE_KEYS.trips), []);
  const trucks         = useMemo(() => getCollection<TruckType>(STORAGE_KEYS.trucks), []);
  const serviceRecords = useMemo(() => getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords), []);
  const fuelRecords    = useMemo(() => getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords), []);

  const totalVenituri = useMemo(
    () => invoices.filter((i) => i.type === "income").reduce((s, i) => s + i.total, 0),
    [invoices]
  );
  const totalCheltuieli = useMemo(
    () => invoices.filter((i) => i.type === "expense").reduce((s, i) => s + i.total, 0),
    [invoices]
  );
  const profitabilitate = totalVenituri - totalCheltuieli;
  const nrNeplatite = useMemo(
    () => invoices.filter((i) => i.status === "overdue" || i.status === "sent").length,
    [invoices]
  );

  const top3Trucks = useMemo(() => {
    return trucks.map((truck) => {
      const serviceCost = serviceRecords
        .filter((r) => r.truckId === truck.id)
        .reduce((s, r) => s + r.cost, 0);
      const fuelCost = fuelRecords
        .filter((r) => r.truckId === truck.id)
        .reduce((s, r) => s + r.cost, 0);
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
      if (!map[order.clientName]) {
        map[order.clientName] = { name: order.clientName, venit: 0, nrComenzi: 0 };
      }
      map[order.clientName].venit += venit;
      map[order.clientName].nrComenzi += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.venit - a.venit)
      .slice(0, 3);
  }, [orders, trips]);

  const barData = useMemo(() => {
    const map: Record<string, { luna: string; Venituri: number; Cheltuieli: number }> = {};
    invoices.forEach((inv) => {
      const luna = inv.date.substring(0, 7);
      if (!map[luna]) map[luna] = { luna, Venituri: 0, Cheltuieli: 0 };
      if (inv.type === "income") map[luna].Venituri += inv.total;
      else map[luna].Cheltuieli += inv.total;
    });
    return Object.values(map)
      .sort((a, b) => a.luna.localeCompare(b.luna))
      .slice(-6)
      .map((r) => ({ ...r, luna: r.luna.slice(5) }));
  }, [invoices]);

  const totalFleetFuel    = useMemo(() => fuelRecords.reduce((s, r) => s + r.cost, 0), [fuelRecords]);
  const totalFleetService = useMemo(() => serviceRecords.reduce((s, r) => s + r.cost, 0), [serviceRecords]);
  const pieData = [
    { name: "Combustibil", value: totalFleetFuel },
    { name: "Service",     value: totalFleetService },
  ];

  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices
      .filter((i) => i.type === "income")
      .forEach((i) => {
        const luna = i.date.substring(0, 7);
        map[luna] = (map[luna] ?? 0) + i.total;
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([luna, Venituri]) => ({ luna: luna.slice(5), Venituri: Math.round(Venituri) }));
  }, [invoices]);

  const rankBadge = (i: number) =>
    i === 0
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border"
      : i === 1
      ? "bg-slate-400/20 text-slate-300 border-slate-400/30 border"
      : "bg-orange-700/20 text-orange-400 border-orange-700/30 border";

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Dashboard General</h1>
      </Header>

      <Main className="space-y-6">

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <KpiCard
            title="Total Venituri"
            value={formatCurrency(totalVenituri)}
            icon={TrendingUp}
            color="bg-green-500/10 text-green-400"
          />
          <KpiCard
            title="Total Cheltuieli"
            value={formatCurrency(totalCheltuieli)}
            icon={TrendingDown}
            color="bg-red-500/10 text-red-400"
          />
          <KpiCard
            title="Profitabilitate"
            value={formatCurrency(profitabilitate)}
            icon={Wallet}
            color={profitabilitate >= 0 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}
            subtitle={
              totalVenituri > 0
                ? `${((profitabilitate / totalVenituri) * 100).toFixed(1)}% marjă`
                : undefined
            }
          />
          <KpiCard
            title="Facturi Neplatite"
            value={String(nrNeplatite)}
            icon={FileWarning}
            color="bg-orange-500/10 text-orange-400"
            subtitle="draft / restante"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4 text-muted-foreground" />
                Top 3 Camioane — Cost Total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Trucks.length === 0 ? (
                <Empty />
              ) : (
                top3Trucks.map((truck, i) => (
                  <div
                    key={truck.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`${rankBadge(i)} text-xs shrink-0`}>#{i + 1}</Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{truck.plateNumber}</p>
                        <p className="text-xs text-muted-foreground">{truck.brand} {truck.model}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-9 sm:pl-0">
                      <p className="font-bold text-sm">{formatCurrency(truck.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(truck.fuelCost)} combustibil</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users className="w-4 h-4 text-muted-foreground" />
                Top 3 Clienți — Venit Estimat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Clients.length === 0 ? (
                <Empty />
              ) : (
                top3Clients.map((client, i) => (
                  <div
                    key={client.name}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`${rankBadge(i)} text-xs shrink-0`}>#{i + 1}</Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.nrComenzi} {client.nrComenzi === 1 ? "comandă" : "comenzi"}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-sm shrink-0 pl-9 sm:pl-0">
                      {formatCurrency(client.venit)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Venituri vs Cheltuieli — ultimele 6 luni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={55}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => [formatCurrency(Number(val))]}
                      labelFormatter={(l) => `Luna ${l}`}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Venituri" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cheltuieli" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Distribuție Cheltuieli Parc Auto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalFleetFuel === 0 && totalFleetService === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [formatCurrency(Number(val))]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Trend Venituri — ultimele 12 luni
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradVenituri" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={55}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(Number(val)), "Venituri"]}
                    labelFormatter={(l) => `Luna ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="Venituri"
                    stroke={COLORS[1]}
                    strokeWidth={2}
                    fill="url(#gradVenituri)"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </Main>
    </>
  );
}