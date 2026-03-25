import { useState } from "react";
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
import { useTranslation } from "react-i18next";

interface Props {
  part: Part;
}

export function AllocatePart({ part }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks),
  );
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");

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
        {t("fleet.allocatePart.button")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("fleet.allocatePart.dialogTitle", { partName: part.name })}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label>{t("fleet.allocatePart.labelTruck")}</Label>
            <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("fleet.allocatePart.selectTruck")}
                />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("fleet.allocatePart.cancel")}
            </Button>
            <Button onClick={handleAllocate} disabled={!selectedTruckId}>
              {t("fleet.allocatePart.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
