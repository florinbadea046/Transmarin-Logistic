import type { Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const ALLOCATIONS_KEY = "transmarin_allocations";

function safeParseAllocations(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function allocatePartToTruck(part: Part, truck: Truck): void {
  const raw = localStorage.getItem(ALLOCATIONS_KEY);
  const allocations = safeParseAllocations(raw);

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