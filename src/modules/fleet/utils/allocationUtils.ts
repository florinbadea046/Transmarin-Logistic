import type { Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const ALLOCATIONS_KEY = "transmarin_allocations";

export function allocatePartToTruck(part: Part, truck: Truck): void {
  const raw = localStorage.getItem(ALLOCATIONS_KEY);
  const allocations = raw ? JSON.parse(raw) : [];

  allocations.push({
    id: crypto.randomUUID(),
    partId: part.id,
    partName: part.name,
    truckId: truck.id,
    truckPlate: truck.plateNumber,
    allocatedAt: new Date().toISOString(),
  });

  localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(allocations));
}