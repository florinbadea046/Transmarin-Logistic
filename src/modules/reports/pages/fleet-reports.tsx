"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Fuel,
  Wrench,
  TrendingDown,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

// ── Types ─────────────────────────────────────────────────────────────────────
import type { Truck as TruckType } from "@/modules/transport/types";
import type { ServiceRecord, FuelRecord } from "@/modules/fleet/types";

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

const PAGE_SIZE = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);

// ── SortHeader (în afara componentei!) ───────────────────────────────────────
function SortHeader({
  label,
  sortKey,
  sortBy,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sortBy: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHead
      className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {label}{" "}
      {sortBy === sortKey ? (
        "↓"
      ) : (
        <span className="text-muted-foreground/40">↕</span>
      )}
    </TableHead>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FleetReportsPage() {
  const { t } = useTranslation();
  const [truckFilter, setTruckFilter] = useState("toate");
  const [monthFilter, setMonthFilter] = useState("toate");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("totalCost");

  const [trucks] = useState<TruckType[]>(() =>
    getCollection<TruckType>(STORAGE_KEYS.trucks),
  );
  const [serviceRecords] = useState<ServiceRecord[]>(() =>
    getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords),
  );
  const [fuelRecords] = useState<FuelRecord[]>(() =>
    getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords),
  );

  const MONTHS = [
    t("fleetReports.months.jan"),
    t("fleetReports.months.feb"),
    t("fleetReports.months.mar"),
    t("fleetReports.months.apr"),
    t("fleetReports.months.may"),
    t("fleetReports.months.jun"),
    t("fleetReports.months.jul"),
    t("fleetReports.months.aug"),
    t("fleetReports.months.sep"),
    t("fleetReports.months.oct"),
    t("fleetReports.months.nov"),
    t("fleetReports.months.dec"),
  ];

  const reports: TruckReport[] = useMemo(() => {
    return trucks.map((truck) => {
      let svc = serviceRecords.filter((r) => r.truckId === truck.id);
      let fuel = fuelRecords.filter((r) => r.truckId === truck.id);
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
        avgFuelConsumption:
          fuelLiters > 0
            ? Math.round((fuelLiters / (truck.mileage / 100)) * 10) / 10
            : 0,
      };
    });
  }, [trucks, serviceRecords, fuelRecords, monthFilter]);

  const filtered = useMemo(() => {
    let result = reports;
    if (truckFilter !== "toate")
      result = result.filter((r) => r.id === truckFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.plateNumber.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q),
      );
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
        <h1 className="text-lg font-semibold">{t("fleetReports.title")}</h1>
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
                  <p className="text-xs text-muted-foreground">
                    {t("fleetReports.serviceCost")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totals.service)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Fuel className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("fleetReports.fuelCost")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totals.fuel)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("fleetReports.totalCost")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totals.total)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("fleetReports.costPerVehicle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={t("fleetReports.searchTruck")}
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <Select value={truckFilter} onValueChange={handleTruckFilter}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder={t("fleetReports.allTrucks")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">
                      {t("fleetReports.allTrucks")}
                    </SelectItem>
                    {trucks.map((tr) => (
                      <SelectItem key={tr.id} value={tr.id}>
                        {tr.plateNumber} — {tr.brand} {tr.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={handleMonthFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder={t("fleetReports.allMonths")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">
                      {t("fleetReports.allMonths")}
                    </SelectItem>
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
                <Select
                  value={sortBy}
                  onValueChange={(v) => handleSort(v as SortKey)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fleetReports.sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalCost">
                      {t("fleetReports.sortTotalCost")}
                    </SelectItem>
                    <SelectItem value="fuelCost">
                      {t("fleetReports.sortFuelCost")}
                    </SelectItem>
                    <SelectItem value="serviceCost">
                      {t("fleetReports.sortServiceCost")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fleetReports.truck")}</TableHead>
                      <TableHead className="text-right">
                        {t("fleetReports.interventions")}
                      </TableHead>
                      <SortHeader
                        label={t("fleetReports.serviceCost")}
                        sortKey="serviceCost"
                        sortBy={sortBy}
                        onSort={handleSort}
                      />
                      <TableHead className="text-right">
                        {t("fleetReports.fuelLiters")}
                      </TableHead>
                      <SortHeader
                        label={t("fleetReports.fuelCost")}
                        sortKey="fuelCost"
                        sortBy={sortBy}
                        onSort={handleSort}
                      />
                      <TableHead className="text-right">
                        {t("fleetReports.avgConsumption")}
                      </TableHead>
                      <SortHeader
                        label={t("fleetReports.totalCost")}
                        sortKey="totalCost"
                        sortBy={sortBy}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          {t("fleetReports.noData")}
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
                                {globalIdx === 0 && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs shrink-0">
                                    {t("fleetReports.topCost")}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {r.serviceCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(r.serviceCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.fuelLiters.toLocaleString("ro-RO")} L
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(r.fuelCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.avgFuelConsumption} L/100km
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(r.totalCost)}
                            </TableCell>
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
                        {globalIdx === 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                            {t("fleetReports.topCost")}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("fleetReports.serviceCost")}
                          </p>
                          <p className="font-medium">
                            {formatCurrency(r.serviceCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("fleetReports.fuelCost")}
                          </p>
                          <p className="font-medium">
                            {formatCurrency(r.fuelCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("fleetReports.fuel")}
                          </p>
                          <p className="font-medium">
                            {r.fuelLiters.toLocaleString("ro-RO")} L
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("fleetReports.avgConsumption")}
                          </p>
                          <p className="font-medium">
                            {r.avgFuelConsumption} L/100km
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm text-muted-foreground">
                          {t("fleetReports.totalCost")}
                        </span>
                        <span className="font-bold text-base">
                          {formatCurrency(r.totalCost)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("fleetReports.pagination", {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
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
