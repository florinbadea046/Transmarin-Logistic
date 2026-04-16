// ──────────────────────────────────────────────────────────
// Unit tests: allocationUtils
// File: src/modules/fleet/utils/allocationUtils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { allocatePartToTruck } from "@/modules/fleet/utils/allocationUtils";
import type { Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const ALLOCATIONS_KEY = "transmarin_allocations";

const makePart = (id: string, name = `Part-${id}`): Part => ({
  id,
  name,
  category: "engine",
  code: `C-${id}`,
  quantity: 10,
  unitPrice: 100,
  supplier: "Bosch",
  minStock: 5,
});

const makeTruck = (id: string, plate = `CT-0${id}-TML`): Truck => ({
  id,
  plateNumber: plate,
  brand: "Volvo",
  model: "FH",
  year: 2020,
  mileage: 100000,
  status: "available",
  itpExpiry: "2027-01-01",
  rcaExpiry: "2027-01-01",
  vignetteExpiry: "2027-01-01",
});

describe("allocatePartToTruck", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a new allocation entry in localStorage", () => {
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].partId).toBe("p1");
    expect(stored[0].truckId).toBe("t1");
  });

  it("includes part name and truck plate in entry", () => {
    allocatePartToTruck(makePart("p1", "Filter Bosch"), makeTruck("t1", "CT-99-XXX"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored[0].partName).toBe("Filter Bosch");
    expect(stored[0].truckPlate).toBe("CT-99-XXX");
  });

  it("generates a unique id for each allocation", () => {
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    allocatePartToTruck(makePart("p2"), makeTruck("t2"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored).toHaveLength(2);
    expect(stored[0].id).not.toBe(stored[1].id);
  });

  it("sets allocatedAt to ISO timestamp", () => {
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(new Date(stored[0].allocatedAt).toString()).not.toBe("Invalid Date");
  });

  it("appends to existing allocations rather than overwriting", () => {
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    allocatePartToTruck(makePart("p2"), makeTruck("t1"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored).toHaveLength(2);
  });

  it("recovers gracefully from corrupted JSON in storage", () => {
    localStorage.setItem(ALLOCATIONS_KEY, "not-json");
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it("recovers gracefully from non-array JSON in storage", () => {
    localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify({ not: "array" }));
    allocatePartToTruck(makePart("p1"), makeTruck("t1"));
    const stored = JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)!);
    expect(stored).toHaveLength(1);
  });
});
