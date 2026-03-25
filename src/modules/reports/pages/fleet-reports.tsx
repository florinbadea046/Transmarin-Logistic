"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fuel, Wrench, TrendingDown, Truck, ChevronLeft, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ServiceRecord {
  truckId: string;
  cost: number;
  date: string;
}
interface FuelRecord {
  truckId: string;
  liters: number;
  cost: number;
  date: string;
}
interface TruckReport {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  mileage: number;
  serviceCount: number;
  serviceCost: number;
  fuelLiters: number;
  fuelCost: number;
  totalCost: number;
  avgFuelConsumption: number;
}
type SortKey = "totalCost" | "fuelCost" | "serviceCost";

// ── Constants ─────────────────────────────────────────────────────────────────
const TRUCKS = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", mileage: 320000 },
  { id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX", mileage: 410000 },
  { id: "t3", plateNumber: "CT-03-TML", brand: "Mercedes", model: "Actros", mileage: 180000 },
  { id: "t4", plateNumber: "CT-04-TML", brand: "Scania", model: "R500", mileage: 295000 },
  { id: "t5", plateNumber: "CT-05-TML", brand: "DAF", model: "XF480", mileage: 360000 },
  { id: "t6", plateNumber: "CT-06-TML", brand: "Iveco", model: "S-Way", mileage: 210000 },
  { id: "t7", plateNumber: "CT-07-TML", brand: "Volvo", model: "FH500", mileage: 440000 },
  { id: "t8", plateNumber: "CT-08-TML", brand: "MAN", model: "TGS", mileage: 155000 },
  { id: "t9", plateNumber: "CT-09-TML", brand: "Renault", model: "T520", mileage: 270000 },
  { id: "t10", plateNumber: "CT-10-TML", brand: "Mercedes", model: "Arocs", mileage: 390000 },
  { id: "t11", plateNumber: "CT-11-TML", brand: "Scania", model: "S580", mileage: 125000 },
  { id: "t12", plateNumber: "CT-12-TML", brand: "DAF", model: "CF450", mileage: 480000 },
  { id: "t13", plateNumber: "CT-13-TML", brand: "Volvo", model: "FM420", mileage: 230000 },
  { id: "t14", plateNumber: "CT-14-TML", brand: "MAN", model: "TGX Euro6", mileage: 345000 },
  { id: "t15", plateNumber: "CT-15-TML", brand: "Iveco", model: "Stralis", mileage: 510000 },
];

const SERVICE_RECORDS: ServiceRecord[] = [
  { truckId: "t1", cost: 2400, date: "2026-01-10" },
  { truckId: "t1", cost: 1800, date: "2026-02-15" },
  { truckId: "t1", cost: 3200, date: "2026-03-01" },
  { truckId: "t2", cost: 5600, date: "2026-01-20" },
  { truckId: "t2", cost: 1200, date: "2026-02-28" },
  { truckId: "t3", cost: 800, date: "2026-02-10" },
  { truckId: "t3", cost: 4100, date: "2026-03-05" },
  { truckId: "t4", cost: 3300, date: "2026-01-15" },
  { truckId: "t4", cost: 2100, date: "2026-03-10" },
  { truckId: "t5", cost: 6800, date: "2026-02-05" },
  { truckId: "t6", cost: 1500, date: "2026-01-25" },
  { truckId: "t6", cost: 900, date: "2026-03-15" },
  { truckId: "t7", cost: 7200, date: "2026-01-08" },
  { truckId: "t7", cost: 3400, date: "2026-02-20" },
  { truckId: "t8", cost: 1100, date: "2026-02-12" },
  { truckId: "t9", cost: 2800, date: "2026-01-30" },
  { truckId: "t9", cost: 1600, date: "2026-03-08" },
  { truckId: "t10", cost: 5100, date: "2026-02-18" },
  { truckId: "t10", cost: 2900, date: "2026-03-12" },
  { truckId: "t11", cost: 700, date: "2026-01-22" },
  { truckId: "t12", cost: 8400, date: "2026-02-08" },
  { truckId: "t12", cost: 3600, date: "2026-03-03" },
  { truckId: "t13", cost: 2200, date: "2026-01-18" },
  { truckId: "t14", cost: 4500, date: "2026-02-25" },
  { truckId: "t14", cost: 1800, date: "2026-03-14" },
  { truckId: "t15", cost: 9200, date: "2026-01-05" },
  { truckId: "t15", cost: 4800, date: "2026-02-22" },
];

const FUEL_RECORDS: FuelRecord[] = [
  { truckId: "t1", liters: 850, cost: 6290, date: "2026-01-15" },
  { truckId: "t1", liters: 920, cost: 6808, date: "2026-02-20" },
  { truckId: "t1", liters: 780, cost: 5772, date: "2026-03-10" },
  { truckId: "t2", liters: 1100, cost: 8140, date: "2026-01-22" },
  { truckId: "t2", liters: 980, cost: 7252, date: "2026-02-25" },
  { truckId: "t2", liters: 1050, cost: 7770, date: "2026-03-12" },
  { truckId: "t3", liters: 620, cost: 4588, date: "2026-02-18" },
  { truckId: "t3", liters: 710, cost: 5254, date: "2026-03-08" },
  { truckId: "t4", liters: 890, cost: 6586, date: "2026-01-20" },
  { truckId: "t4", liters: 760, cost: 5624, date: "2026-03-15" },
  { truckId: "t5", liters: 1200, cost: 8880, date: "2026-02-10" },
  { truckId: "t5", liters: 1050, cost: 7770, date: "2026-03-05" },
  { truckId: "t6", liters: 680, cost: 5032, date: "2026-01-28" },
  { truckId: "t6", liters: 590, cost: 4366, date: "2026-03-18" },
  { truckId: "t7", liters: 1350, cost: 9990, date: "2026-01-12" },
  { truckId: "t7", liters: 1180, cost: 8732, date: "2026-02-28" },
  { truckId: "t8", liters: 540, cost: 3996, date: "2026-02-15" },
  { truckId: "t8", liters: 620, cost: 4588, date: "2026-03-20" },
  { truckId: "t9", liters: 820, cost: 6068, date: "2026-02-05" },
  { truckId: "t9", liters: 750, cost: 5550, date: "2026-03-10" },
  { truckId: "t10", liters: 1080, cost: 7992, date: "2026-02-22" },
  { truckId: "t10", liters: 940, cost: 6956, date: "2026-03-15" },
  { truckId: "t11", liters: 480, cost: 3552, date: "2026-01-25" },
  { truckId: "t11", liters: 520, cost: 3848, date: "2026-03-02" },
  { truckId: "t12", liters: 1400, cost: 10360, date: "2026-02-12" },
  { truckId: "t12", liters: 1250, cost: 9250, date: "2026-03-08" },
  { truckId: "t13", liters: 720, cost: 5328, date: "2026-01-30" },
  { truckId: "t13", liters: 680, cost: 5032, date: "2026-03-12" },
  { truckId: "t14", liters: 950, cost: 7030, date: "2026-02-18" },
  { truckId: "t14", liters: 880, cost: 6512, date: "2026-03-20" },
  { truckId: "t15", liters: 1500, cost: 11100, date: "2026-01-08" },
  { truckId: "t15", liters: 1380, cost: 10212, date: "2026-02-25" },
];

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

const PAGE_SIZE = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(n);

// ── SortHeader (în afara componentei!) ───────────────────────────────────────
function SortHeader({ label, sortKey, sortBy, onSort }: { label: string; sortKey: SortKey; sortBy: SortKey; onSort: (key: SortKey) => void }) {
  return (
    <TableHead className="text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort(sortKey)}>
      {label} {sortBy === sortKey ? "↓" : <span className="text-muted-foreground/40">↕</span>}
    </TableHead>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FleetReportsPage() {
  const [truckFilter, setTruckFilter] = useState("toate");
  const [monthFilter, setMonthFilter] = useState("toate");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("totalCost");

  const reports: TruckReport[] = useMemo(() => {
    return TRUCKS.map((truck) => {
      let svc = SERVICE_RECORDS.filter((r) => r.truckId === truck.id);
      let fuel = FUEL_RECORDS.filter((r) => r.truckId === truck.id);
      if (monthFilter !== "toate") {
        const m = parseInt(monthFilter);
        svc = svc.filter((r) => new Date(r.date).getMonth() === m);
        fuel = fuel.filter((r) => new Date(r.date).getMonth() === m);
      }
      const serviceCost = svc.reduce((s, r) => s + r.cost, 0);
      const fuelCost = fuel.reduce((s, r) => s + r.cost, 0);
      const fuelLiters = fuel.reduce((s, r) => s + r.liters, 0);
      return {
        id: truck.id,
        plateNumber: truck.plateNumber,
        brand: truck.brand,
        model: truck.model,
        mileage: truck.mileage,
        serviceCount: svc.length,
        serviceCost,
        fuelLiters,
        fuelCost,
        totalCost: serviceCost + fuelCost,
        avgFuelConsumption: fuelLiters > 0 ? Math.round((fuelLiters / (truck.mileage / 100)) * 10) / 10 : 0,
      };
    });
  }, [monthFilter]);

  const filtered = useMemo(() => {
    let result = reports;
    if (truckFilter !== "toate") result = result.filter((r) => r.id === truckFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.plateNumber.toLowerCase().includes(q) || r.brand.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [reports, truckFilter, search, sortBy]);

  const totals = useMemo(
    () => ({
      service: filtered.reduce((s, r) => s + r.serviceCost, 0),
      fuel: filtered.reduce((s, r) => s + r.fuelCost, 0),
      total: filtered.reduce((s, r) => s + r.totalCost, 0),
    }),
    [filtered],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTruckFilter = (v: string) => {
    setTruckFilter(v);
    setPage(1);
  };
  const handleMonthFilter = (v: string) => {
    setMonthFilter(v);
    setPage(1);
  };
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleSort = (key: SortKey) => {
    setSortBy(key);
    setPage(1);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Parc Auto</h1>
      </Header>
      <Main>
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost Service</p>
                  <p className="text-lg font-bold">{formatCurrency(totals.service)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Fuel className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost Combustibil</p>
                  <p className="text-lg font-bold">{formatCurrency(totals.fuel)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost Total</p>
                  <p className="text-lg font-bold">{formatCurrency(totals.total)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost per Vehicul</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Caută camion..." value={search} onChange={(e) => handleSearch(e.target.value)} />
                </div>
                <Select value={truckFilter} onValueChange={handleTruckFilter}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Toate camioanele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">Toate camioanele</SelectItem>
                    {TRUCKS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.plateNumber} — {t.brand} {t.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={handleMonthFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Toate lunile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">Toate lunile</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile sort selector */}
              <div className="flex md:hidden mb-4">
                <Select value={sortBy} onValueChange={(v) => handleSort(v as SortKey)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sortează după..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalCost">Sortare: Cost Total</SelectItem>
                    <SelectItem value="fuelCost">Sortare: Cost Combustibil</SelectItem>
                    <SelectItem value="serviceCost">Sortare: Cost Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Camion</TableHead>
                      <TableHead className="text-right">Intervenții</TableHead>
                      <SortHeader label="Cost Service" sortKey="serviceCost" sortBy={sortBy} onSort={handleSort} />
                      <TableHead className="text-right">Combustibil (L)</TableHead>
                      <SortHeader label="Cost Combustibil" sortKey="fuelCost" sortBy={sortBy} onSort={handleSort} />
                      <TableHead className="text-right">Consum Mediu</TableHead>
                      <SortHeader label="Cost Total" sortKey="totalCost" sortBy={sortBy} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nu există date pentru filtrele selectate.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((r, idx) => {
                        const globalIdx = (page - 1) * PAGE_SIZE + idx;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">{r.plateNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {r.brand} {r.model}
                                  </p>
                                </div>
                                {globalIdx === 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs shrink-0">Top cost</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{r.serviceCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.serviceCost)}</TableCell>
                            <TableCell className="text-right">{r.fuelLiters.toLocaleString("ro-RO")} L</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.fuelCost)}</TableCell>
                            <TableCell className="text-right">{r.avgFuelConsumption} L/100km</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(r.totalCost)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {paginated.map((r, idx) => {
                  const globalIdx = (page - 1) * PAGE_SIZE + idx;
                  return (
                    <div key={r.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{r.plateNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.brand} {r.model}
                          </p>
                        </div>
                        {globalIdx === 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">Top cost</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Cost Service</p>
                          <p className="font-medium">{formatCurrency(r.serviceCost)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cost Combustibil</p>
                          <p className="font-medium">{formatCurrency(r.fuelCost)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Combustibil</p>
                          <p className="font-medium">{r.fuelLiters.toLocaleString("ro-RO")} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Consum Mediu</p>
                          <p className="font-medium">{r.avgFuelConsumption} L/100km</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm text-muted-foreground">Cost Total</span>
                        <span className="font-bold text-base">{formatCurrency(r.totalCost)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{`${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} din ${filtered.length} vehicule`}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button key={p} variant={p === page ? "default" : "outline"} size="icon" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
