import { useEffect, useState, useMemo } from "react";
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setRecords(getCollection<FuelRecord>(STORAGE_KEYS.fuelRecords));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  const save = (updated: FuelRecord[]) => {
    setRecords(updated);
    localStorage.setItem(STORAGE_KEYS.fuelRecords, JSON.stringify(updated));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["liters", "cost", "mileage"].includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = () => {
    if (!form.truckId || !form.date) return;
    const newRecord: FuelRecord = { id: crypto.randomUUID(), ...form };
    save([...records, newRecord]);
    setForm(emptyForm);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    save(records.filter((r) => r.id !== id));
  };

  const truckRecordsMap = useMemo(() => buildTruckRecordsMap(records), [records]);
  const chartData = useMemo(() => buildChartData(records, trucks), [records, trucks]);

  const getTruckLabel = (id: string) => {
    const t = trucks.find((t) => t.id === id);
    return t ? `${t.plateNumber} — ${t.brand} ${t.model}` : id;
  };

  return (
    <div className="space-y-6 px-6 pb-6">
      <div className="flex flex-wrap gap-2 pt-4">
        <Button onClick={() => setOpen(true)}>+ Înregistrează alimentare</Button>
        <Button variant="outline" onClick={() => exportFuelToCSV(records, trucks)}>
          ⬇ Export CSV
        </Button>
      </div>

      {chartData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Consum combustibil (L/100km) per camion
          </h3>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[400px]">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" tick={{ fontSize: 11 }} tickFormatter={(v) => `Alim. ${v}`} />
                  <YAxis unit="L" tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v) => `${v} L/100km`} />
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
        <p className="text-muted-foreground text-center py-10">Nu există înregistrări de combustibil.</p>
      ) : (
        <div className="w-full overflow-x-auto -mx-6 px-6">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Camion</TableHead>
                  <TableHead className="whitespace-nowrap">Dată</TableHead>
                  <TableHead className="whitespace-nowrap">Litri</TableHead>
                  <TableHead className="whitespace-nowrap">Cost</TableHead>
                  <TableHead className="whitespace-nowrap">Km</TableHead>
                  <TableHead className="whitespace-nowrap">Consum/100km</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const truckRecords = truckRecordsMap[record.truckId] || [];
                  const cons = getConsumption(record, truckRecords);
                  const isAlert = cons !== null && parseFloat(cons) > ALERT_THRESHOLD;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-semibold whitespace-nowrap">{getTruckLabel(record.truckId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.liters} L</TableCell>
                      <TableCell className="whitespace-nowrap">{record.cost.toLocaleString("ro-RO")} RON</TableCell>
                      <TableCell className="whitespace-nowrap">{record.mileage.toLocaleString("ro-RO")} km</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {cons === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={isAlert ? "text-red-500 font-semibold" : ""}>
                            {cons} L/100km{" "}
                            {isAlert && (
                              <>
                                <span aria-hidden="true">⚠️</span>
                                <span className="sr-only">Consumul este anormal</span>
                              </>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                            Șterge
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
            <DialogTitle>Înregistrează alimentare</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label>Camion</Label>
              <Select value={form.truckId} onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selectează camion..." /></SelectTrigger>
                <SelectContent>
                  {trucks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.plateNumber} — {t.brand} {t.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dată</Label>
                <Input name="date" type="date" value={form.date} onChange={handleChange} className="w-full [&::-webkit-calendar-picker-indicator]:ml-auto" />
              </div>
              <div className="space-y-1">
                <Label>Km curent</Label>
                <Input name="mileage" type="number" value={form.mileage} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Litri alimentați</Label>
                <Input name="liters" type="number" value={form.liters} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <Label>Cost (RON)</Label>
                <Input name="cost" type="number" value={form.cost} onChange={handleChange} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={handleSubmit} disabled={!form.truckId || !form.date}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}