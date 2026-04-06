import { useMemo, useState } from "react";
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
import { toast } from "sonner";

import type { ServiceRecord, Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

import {
  TYPE_LABELS,
  calculateTotalCost,
  getPartName,
} from "@/modules/fleet/utils/serviceUtils";
import { exportServiceToPDF } from "@/modules/fleet/utils/exportPDF";

type FormPart = {
  id: string;
  partId: string;
  quantity: number;
};

const createEmptyForm = () => ({
  truckId: "",
  date: "",
  type: "revision" as ServiceRecord["type"],
  description: "",
  mileageAtService: 0,
  nextServiceDate: "",
  partsUsed: [] as FormPart[],
});

interface ServiceCRUDProps {
  records: ServiceRecord[];
  trucks: Truck[];
  onRecordsChange: (updated: ServiceRecord[]) => void;
}

function syncTruckStatus(truckId: string, allRecords: ServiceRecord[]) {
  const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);
  const today = new Date().toISOString().split("T")[0];

  const hasActiveService = allRecords
    .filter((r) => r.truckId === truckId)
    .some((r) => {
      const isRecent =
        new Date(r.date) >=
        new Date(new Date().setDate(new Date().getDate() - 30));
      const hasUpcoming = r.nextServiceDate
        ? r.nextServiceDate >= today
        : false;
      return isRecent || hasUpcoming;
    });

  const updatedTrucks = trucks.map((t) => {
    if (t.id !== truckId) return t;
    if (t.status === "on_trip") return t;
    return {
      ...t,
      status: hasActiveService ? "in_service" : "available",
    } as Truck;
  });

  localStorage.setItem(STORAGE_KEYS.trucks, JSON.stringify(updatedTrucks));
}

export function ServiceCRUD({
  records,
  trucks,
  onRecordsChange,
}: ServiceCRUDProps) {
  const [parts] = useState<Part[]>(() =>
    getCollection<Part>(STORAGE_KEYS.parts),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterTruckId, setFilterTruckId] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filterTruckId !== "all" && record.truckId !== filterTruckId)
        return false;
      if (filterFrom && record.date < filterFrom) return false;
      if (filterTo && record.date > filterTo) return false;
      return true;
    });
  }, [filterFrom, filterTo, filterTruckId, records]);

  const persist = (data: ServiceRecord[], affectedTruckId?: string) => {
    onRecordsChange(data);
    localStorage.setItem(STORAGE_KEYS.serviceRecords, JSON.stringify(data));
    if (affectedTruckId) syncTruckStatus(affectedTruckId, data);
  };

  const getTruckLabel = (id: string) => {
    const truck = trucks.find((t) => t.id === id);
    return truck ? `${truck.plateNumber} — ${truck.brand} ${truck.model}` : id;
  };

  const totalCost = useMemo(
    () => calculateTotalCost(form.partsUsed, parts),
    [form.partsUsed, parts],
  );

  const addPart = () => {
    setForm((prev) => ({
      ...prev,
      partsUsed: [
        ...prev.partsUsed,
        { id: crypto.randomUUID(), partId: "", quantity: 1 },
      ],
    }));
  };

  const removePart = (id: string) => {
    setForm((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((p) => p.id !== id),
    }));
  };

  const updatePart = (
    id: string,
    field: "partId" | "quantity",
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));
  };

  const handleEdit = (record: ServiceRecord) => {
    setForm({
      ...record,
      partsUsed: record.partsUsed.map((p) => ({
        id: crypto.randomUUID(),
        partId: p.partId,
        quantity: p.quantity,
      })),
      nextServiceDate: record.nextServiceDate || "",
    });
    setEditingId(record.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.truckId || !form.date) return;

    const payload: ServiceRecord = {
      id: editingId || crypto.randomUUID(),
      ...form,
      partsUsed: form.partsUsed.map(({ id: _id, ...rest }) => rest),
      cost: totalCost,
      nextServiceDate: form.nextServiceDate || undefined,
    };

    let updated: ServiceRecord[];
    if (editingId) {
      updated = records.map((r) => (r.id === editingId ? payload : r));
      toast.success("Service actualizat");
    } else {
      updated = [...records, payload];
      toast.success("Service adăugat");
    }

    persist(updated, form.truckId);
    setForm(createEmptyForm());
    setEditingId(null);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    const record = records.find((r) => r.id === id);
    const updated = records.filter((r) => r.id !== id);
    persist(updated, record?.truckId);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-end mb-4 px-4 md:px-6">
        <Button
          onClick={() => {
            setForm(createEmptyForm());
            setEditingId(null);
            setOpen(true);
          }}
        >
          + Programează service
        </Button>

        <Select value={filterTruckId} onValueChange={setFilterTruckId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toate camioanele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate camioanele</SelectItem>
            {trucks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.plateNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-36"
        />
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-36"
        />

        <Button
          variant="outline"
          onClick={() =>
            exportServiceToPDF(filteredRecords, trucks, {
              truckId: filterTruckId === "all" ? undefined : filterTruckId,
              fromDate: filterFrom || undefined,
              toDate: filterTo || undefined,
            })
          }
        >
          ⬇ Export PDF
        </Button>
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          Nu există înregistrări de service.
        </p>
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
                <TableHead>Piese</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Următor</TableHead>
                <TableHead className="text-center">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-semibold">
                    {getTruckLabel(record.truckId)}
                  </TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[record.type]}</Badge>
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>
                    {record.mileageAtService.toLocaleString("ro-RO")} km
                  </TableCell>
                  <TableCell>
                    {record.partsUsed.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="text-xs space-y-1">
                        {record.partsUsed.map((pu, index) => (
                          <li key={`${pu.partId}-${index}`}>
                            {getPartName(parts, pu.partId)} × {pu.quantity}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {record.cost.toLocaleString("ro-RO")} RON
                  </TableCell>
                  <TableCell>{record.nextServiceDate ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(record)}
                      >
                        Editează
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(record.id)}
                      >
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setForm(createEmptyForm());
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editează service" : "Programează service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Camion</Label>
                <Select
                  value={form.truckId}
                  onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează camion..." />
                  </SelectTrigger>
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
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as ServiceRecord["type"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descriere</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Dată</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Km la service</Label>
                <Input
                  type="number"
                  value={form.mileageAtService}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      mileageAtService: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Următor service</Label>
                <Input
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nextServiceDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Piese consumate</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPart}
                >
                  + Adaugă piesă
                </Button>
              </div>
              {form.partsUsed.map((pu) => (
                <div key={pu.id} className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={pu.partId}
                    onValueChange={(v) => updatePart(pu.id, "partId", v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selectează piesă..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.unitPrice} RON)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={pu.quantity}
                    onChange={(e) =>
                      updatePart(pu.id, "quantity", Number(e.target.value))
                    }
                    className="sm:w-24"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removePart(pu.id)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {form.partsUsed.length > 0 && (
                <p className="text-sm font-semibold text-right">
                  Cost total: {totalCost.toLocaleString("ro-RO")} RON
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.truckId || !form.date}
            >
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
