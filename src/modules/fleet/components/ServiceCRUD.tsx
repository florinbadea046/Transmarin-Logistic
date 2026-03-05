import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { ServiceRecord, Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const typeLabels: Record<ServiceRecord["type"], string> = {
  revision: "Revizie",
  repair:   "Reparație",
  itp:      "ITP",
  other:    "Altele",
};

const emptyForm = {
  truckId: "",
  date: "",
  type: "revision" as ServiceRecord["type"],
  description: "",
  mileageAtService: 0,
  nextServiceDate: "",
  partsUsed: [] as { partId: string; quantity: number }[],
};

export function ServiceCRUD() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setRecords(getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
    setParts(getCollection<Part>(STORAGE_KEYS.parts));
  }, []);

  const save = (updated: ServiceRecord[]) => {
    setRecords(updated);
    localStorage.setItem(STORAGE_KEYS.serviceRecords, JSON.stringify(updated));
  };

  const getTruckLabel = (id: string) => {
    const t = trucks.find((t) => t.id === id);
    return t ? `${t.plateNumber} — ${t.brand} ${t.model}` : id;
  };

  const getPartName = (id: string) => {
    return parts.find((p) => p.id === id)?.name ?? id;
  };

  const getPartPrice = (id: string) => {
    return parts.find((p) => p.id === id)?.unitPrice ?? 0;
  };

  // Calcul cost total din piesele selectate
  const totalCost = form.partsUsed.reduce((sum, pu) => {
    return sum + getPartPrice(pu.partId) * pu.quantity;
  }, 0);

  const handleAddPart = () => {
    setForm((prev) => ({
      ...prev,
      partsUsed: [...prev.partsUsed, { partId: "", quantity: 1 }],
    }));
  };

  const handleRemovePart = (index: number) => {
    setForm((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index),
    }));
  };

  const handlePartChange = (index: number, field: "partId" | "quantity", value: string | number) => {
    setForm((prev) => {
      const updated = [...prev.partsUsed];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, partsUsed: updated };
    });
  };

  const handleSubmit = () => {
    const newRecord: ServiceRecord = {
      id: crypto.randomUUID(),
      ...form,
      cost: totalCost,
      nextServiceDate: form.nextServiceDate || undefined,
    };
    save([...records, newRecord]);
    setForm(emptyForm);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    save(records.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="flex justify-start mb-4 px-6">
        <Button onClick={() => setOpen(true)}>+ Programează service</Button>
      </div>

      {records.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">Nu există înregistrări de service.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camion</TableHead>
                <TableHead>Dată</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Descriere</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>Piese folosite</TableHead>
                <TableHead>Cost total</TableHead>
                <TableHead>Următor service</TableHead>
                <TableHead className="text-center">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-semibold">{getTruckLabel(record.truckId)}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[record.type]}</Badge>
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{record.mileageAtService.toLocaleString("ro-RO")} km</TableCell>
                  <TableCell>
                    {record.partsUsed.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="text-xs space-y-0.5">
                        {record.partsUsed.map((pu, i) => (
                          <li key={i}>{getPartName(pu.partId)} × {pu.quantity}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{record.cost.toLocaleString("ro-RO")} RON</TableCell>
                  <TableCell>{record.nextServiceDate ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                        Șterge
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programează service nou</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Camion + Tip */}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-1">
                <Label>Tip service</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as ServiceRecord["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descriere */}
            <div className="space-y-1">
              <Label>Descriere</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Schimb ulei + filtre"
              />
            </div>

            {/* Dată + Km + Următor service */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Dată</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Km la service</Label>
                <Input
                  type="number"
                  value={form.mileageAtService}
                  onChange={(e) => setForm((p) => ({ ...p, mileageAtService: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Următor service</Label>
                <Input
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) => setForm((p) => ({ ...p, nextServiceDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Piese folosite */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Piese consumate</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddPart}>
                  + Adaugă piesă
                </Button>
              </div>
              {form.partsUsed.map((pu, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select value={pu.partId} onValueChange={(v) => handlePartChange(index, "partId", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selectează piesă..." /></SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.unitPrice} RON/buc)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={pu.quantity}
                    onChange={(e) => handlePartChange(index, "quantity", Number(e.target.value))}
                    className="w-20"
                  />
                  <Button type="button" size="sm" variant="destructive" onClick={() => handleRemovePart(index)}>
                    ✕
                  </Button>
                </div>
              ))}

              {/* Cost total calculat */}
              {form.partsUsed.length > 0 && (
                <p className="text-sm font-semibold text-right pt-1">
                  Cost total: {totalCost.toLocaleString("ro-RO")} RON
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={handleSubmit} disabled={!form.truckId || !form.date}>
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}