import type { Trip, Driver, Truck } from "@/modules/transport/types";

export interface AutoAssignSuggestion {
  driver: Driver;
  truck: Truck;
  driverKmThisMonth: number;
  truckKmThisMonth: number;
  score: number;
}

function getKmThisMonth(trips: Trip[], idKey: "driverId" | "truckId", id: string): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return trips
    .filter((trip) => {
      if (trip[idKey] !== id) return false;
      if (!trip.departureDate) return false;
      const d = new Date(trip.departureDate);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, trip) => sum + (trip.kmLoaded ?? 0) + (trip.kmEmpty ?? 0), 0);
}

export function getAutoAssignSuggestions(
  drivers: Driver[],
  trucks: Truck[],
  allTrips: Trip[],
  limit = 3,
): AutoAssignSuggestion[] {
  const availableDrivers = drivers.filter((d) => d.status === "available");
  const availableTrucks = trucks.filter((t) => t.status === "available");

  if (availableDrivers.length === 0 || availableTrucks.length === 0) return [];

  const suggestions: AutoAssignSuggestion[] = [];

  for (const driver of availableDrivers) {
    for (const truck of availableTrucks) {
      const driverKm = getKmThisMonth(allTrips, "driverId", driver.id);
      const truckKm = getKmThisMonth(allTrips, "truckId", truck.id);
      const score = driverKm + truckKm;

      suggestions.push({
        driver,
        truck,
        driverKmThisMonth: driverKm,
        truckKmThisMonth: truckKm,
        score,
      });
    }
  }

  suggestions.sort((a, b) => a.score - b.score);

  const usedDrivers = new Set<string>();
  const usedTrucks = new Set<string>();
  const result: AutoAssignSuggestion[] = [];

  for (const s of suggestions) {
    if (usedDrivers.has(s.driver.id) || usedTrucks.has(s.truck.id)) continue;
    usedDrivers.add(s.driver.id);
    usedTrucks.add(s.truck.id);
    result.push(s);
    if (result.length >= limit) break;
  }

  return result;
}
