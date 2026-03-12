import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

interface Props {
  part: Part;
}

export function AllocatePart({ part }: Props) {
  const [open, setOpen] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.trucks);
    if (raw) setTrucks(JSON.parse(raw));
  }, []);

  const handleAllocate = () => {
    if (!selectedTruckId) return;

    const truck = trucks.find((t) => t.id === selectedTruckId);
    if (!truck) return;

    const rawAllocations = localStorage.getItem("transmarin_allocations");
    const allocations = rawAllocations ? JSON.parse(rawAllocations) : [];

    allocations.push({
      id: crypto.randomUUID(),
      partId: part.id,
      partName: part.name,
      truckId: truck.id,
      truckPlate: truck.plateNumber,
      allocatedAt: new Date().toISOString(),
    });

    localStorage.setItem("transmarin_allocations", JSON.stringify(allocations));
    setOpen(false);
    setSelectedTruckId("");
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Alocă
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alocă „{part.name}" la camion</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label>Selectează camionul</Label>
            <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
              <SelectTrigger>
                <SelectValue placeholder="Alege un camion..." />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id}>
                    {truck.plateNumber} — {truck.brand} {truck.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={handleAllocate} disabled={!selectedTruckId}>
              Alocă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}