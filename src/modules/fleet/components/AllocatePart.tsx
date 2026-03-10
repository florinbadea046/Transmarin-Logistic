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
import { allocatePartToTruck } from "@/modules/fleet/utils/allocationUtils";
import { getCollection } from "@/utils/local-storage";



interface Props {
  part: Part;
}

export function AllocatePart({ part }: Props) {
  const [open, setOpen] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");

  useEffect(() => {
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  const handleAllocate = () => {
    if (!selectedTruckId) return;
    const truck = trucks.find((t) => t.id === selectedTruckId);
    if (!truck) return;
    allocatePartToTruck(part, truck);
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