import { useState, useMemo, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuditLog } from "@/hooks/use-audit-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import {
  getConsumption,
  buildChartData,
  buildTruckRecordsMap,
  ALERT_THRESHOLD,
  CHART_COLORS,
} from "@/modules/fleet/utils/fuelUtils";
import type { FuelRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";
import { exportFuelToCSV } from "@/modules/fleet/utils/exportCSV";

const emptyForm = {
  truckId: "",
  date: "",
  liters: 0,
  cost: 0,
  mileage: 0,
};

export function FuelCRUD() {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const [records, setRecords] = useState<FuelRecord[]>(() =>
    getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords),
  );
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const save = (updated: FuelRecord[]) => {
    setRecords(updated);
    localStorage.setItem(STORAGE_KEYS.fuelRecords, JSON.stringify(updated));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["liters", "cost", "mileage"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = () => {
    if (!form.truckId || !form.date) return;
    const newId = crypto.randomUUID();
    const newRecord: FuelRecord = { id: newId, ...form };
    const truckLabel = trucks.find((tr) => tr.id === form.truckId)?.plateNumber ?? form.truckId;
    save([...records, newRecord]);
    log({ action: "create", entity: "fuelLog", entityId: newId, entityLabel: truckLabel, detailKey: "activityLog.details.fuelLogCreated", detailParams: { truck: truckLabel } });
    setForm(emptyForm);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    const record = records.find((r) => r.id === id);
    const truckLabel = record ? (trucks.find((tr) => tr.id === record.truckId)?.plateNumber ?? record.truckId) : id;
    save(records.filter((r) => r.id !== id));
    log({ action: "delete", entity: "fuelLog", entityId: id, entityLabel: truckLabel, detailKey: "activityLog.details.fuelLogDeleted" });
  };

  const truckRecordsMap = useMemo(
    () => buildTruckRecordsMap(records),
    [records],
  );
  const chartData = useMemo(
    () => buildChartData(records, trucks),
    [records, trucks],
  );

  const getTruckLabel = (id: string) => {
    const tr = trucks.find((tr) => tr.id === id);
    return tr ? `${tr.plateNumber} — ${tr.brand} ${tr.model}` : id;
  };

  return (
    <div className="space-y-6 px-6 pb-6">
      <div className="flex flex-wrap gap-2 pt-4">
        <Button onClick={() => setOpen(true)}>
          {t("fleet.fuel.addRecord")}
        </Button>
        <Button
          variant="outline"
          onClick={() => exportFuelToCSV(records, trucks, t)}
        >
          {t("fleet.fuel.exportCSV")}
        </Button>
      </div>

      {chartData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            {t("fleet.fuel.chartTitle")}
          </h3>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[400px]">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="index"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${t("fleet.fuel.refuel")} ${v}`}
                  />
                  <YAxis unit="L" tick={{ fontSize: 11 }} width={40} />
                  <ChartTooltip formatter={(v) => `${v} L/100km`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trucks.map((truck, i) => (
                    <Line
                      key={truck.id}
                      type="monotone"
                      dataKey={truck.plateNumber}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          {t("fleet.fuel.noRecords")}
        </p>
      ) : (
        <div className="w-full overflow-x-auto -mx-6 px-6">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnTruck")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnDate")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnLiters")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnCost")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnKm")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("fleet.fuel.columnConsumption")}
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    {t("fleet.fuel.columnActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const truckRecords = truckRecordsMap[record.truckId] || [];
                  const cons = getConsumption(record, truckRecords);
                  const isAlert =
                    cons !== null && parseFloat(cons) > ALERT_THRESHOLD;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {getTruckLabel(record.truckId)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.date}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.liters} L
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.cost.toLocaleString("ro-RO")} RON
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.mileage.toLocaleString("ro-RO")} km
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {cons === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              isAlert ? "text-red-500 font-semibold" : ""
                            }
                          >
                            {cons} L/100km{" "}
                            {isAlert && (
                              <>
                                <span aria-hidden="true">⚠️</span>
                                <span className="sr-only">
                                  {t("fleet.fuel.abnormalConsumption")}
                                </span>
                              </>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(record.id)}
                          >
                            {t("fleet.fuel.delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fleet.fuel.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label>{t("fleet.fuel.labelTruck")}</Label>
              <Select
                value={form.truckId}
                onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fleet.fuel.selectTruck")} />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.plateNumber} — {tr.brand} {tr.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("fleet.fuel.labelDate")}</Label>
                <Input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full [&::-webkit-calendar-picker-indicator]:ml-auto"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("fleet.fuel.labelCurrentKm")}</Label>
                <Input
                  name="mileage"
                  type="number"
                  value={form.mileage}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("fleet.fuel.labelLiters")}</Label>
                <Input
                  name="liters"
                  type="number"
                  value={form.liters}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("fleet.fuel.labelCost")}</Label>
                <Input
                  name="cost"
                  type="number"
                  value={form.cost}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("fleet.fuel.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.truckId || !form.date}
            >
              {t("fleet.fuel.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
