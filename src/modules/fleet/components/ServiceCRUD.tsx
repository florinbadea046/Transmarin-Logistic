import { useEffect, useMemo, useState } from "react";
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
import { getCollection, updateItem } from "@/utils/local-storage";
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

export function ServiceCRUD() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterTruckId, setFilterTruckId] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    setRecords(getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
    setParts(getCollection<Part>(STORAGE_KEYS.parts));
  }, []);

  const refresh = () => {
    setRecords(getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords));
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
      partsUsed: form.partsUsed.map(({ id, ...rest }) => rest),
      cost: totalCost,
      nextServiceDate: form.nextServiceDate || undefined,
    };

    if (editingId) {
      updateItem<ServiceRecord>(
        STORAGE_KEYS.serviceRecords,
        (r) => r.id === editingId,
        () => payload,
      );
      toast.success("Service actualizat");
    } else {
      const all = getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords);
      localStorage.setItem(
        STORAGE_KEYS.serviceRecords,
        JSON.stringify([...all, payload]),
      );
      toast.success("Service adăugat");
    }

    setForm(createEmptyForm());
    setEditingId(null);
    setOpen(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.serviceRecords, JSON.stringify(updated));
    setRecords(updated);
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
            exportServiceToPDF(records, trucks, {
              truckId: filterTruckId === "all" ? undefined : filterTruckId,
              fromDate: filterFrom || undefined,
              toDate: filterTo || undefined,
            })
          }
        >
          ⬇ Export PDF
        </Button>
      </div>

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
          {records.map((record) => (
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
                  "—"
                ) : (
                  <ul className="text-xs">
                    {record.partsUsed.map((pu, i) => (
                      <li key={i}>
                        {getPartName(parts, pu.partId)} × {pu.quantity}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell>{record.cost.toLocaleString("ro-RO")} RON</TableCell>
              <TableCell>{record.nextServiceDate ?? "—"}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={() => handleEdit(record)}>
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

          <div className="space-y-4 py-4">
            <Label>Camion</Label>
            <Select
              value={form.truckId}
              onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.plateNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Descriere"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
            />

            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />

            <Input
              type="number"
              placeholder="Km"
              value={form.mileageAtService}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  mileageAtService: Number(e.target.value),
                }))
              }
            />

            <Input
              type="date"
              value={form.nextServiceDate}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  nextServiceDate: e.target.value,
                }))
              }
            />

            <Button type="button" onClick={addPart}>
              + Piesă
            </Button>

            {form.partsUsed.map((pu) => (
              <div key={pu.id} className="flex gap-2">
                <Select
                  value={pu.partId}
                  onValueChange={(v) => updatePart(pu.id, "partId", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={pu.quantity}
                  onChange={(e) =>
                    updatePart(pu.id, "quantity", Number(e.target.value))
                  }
                />

                <Button variant="destructive" onClick={() => removePart(pu.id)}>
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
