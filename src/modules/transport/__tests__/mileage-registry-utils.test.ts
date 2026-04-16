import { describe, it, expect, beforeEach } from "vitest";
import {
  MILEAGE_KEY,
  getMileageEntries,
  saveMileageEntries,
  upsertEntry,
  buildRows,
  buildChartData,
  entrySchema,
  type MileageEntry,
} from "@/modules/transport/pages/_components/mileage-registry-utils";
import type { Truck, Trip } from "@/modules/transport/types";

const makeTruck = (id: string, plate: string, mileage = 100000): Truck => ({
  id,
  plateNumber: plate,
  brand: "Volvo",
  model: "FH",
  year: 2020,
  mileage,
  status: "available",
  itpExpiry: "2027-01-01",
  rcaExpiry: "2027-01-01",
  vignetteExpiry: "2027-01-01",
});

const makeTrip = (id: string, truckId: string, date: string, kmL = 100, kmE = 50): Trip => ({
  id,
  orderId: "o1",
  driverId: "d1",
  truckId,
  departureDate: date,
  estimatedArrivalDate: date,
  kmLoaded: kmL,
  kmEmpty: kmE,
  fuelCost: 0,
  status: "finalizata",
});

describe("getMileageEntries / saveMileageEntries / upsertEntry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when storage is empty", () => {
    expect(getMileageEntries()).toEqual([]);
  });

  it("returns empty array on malformed JSON", () => {
    localStorage.setItem(MILEAGE_KEY, "not-json");
    expect(getMileageEntries()).toEqual([]);
  });

  it("save then get round-trips entries", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 100000, kmEnd: 105000 },
    ];
    saveMileageEntries(entries);
    expect(getMileageEntries()).toEqual(entries);
  });

  it("upsertEntry adds new entry when not present", () => {
    upsertEntry({ truckId: "t1", month: "2026-04", kmStart: 100, kmEnd: 200 });
    const stored = getMileageEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].kmEnd).toBe(200);
  });

  it("upsertEntry updates existing entry by truckId+month", () => {
    upsertEntry({ truckId: "t1", month: "2026-04", kmStart: 100, kmEnd: 200 });
    upsertEntry({ truckId: "t1", month: "2026-04", kmStart: 100, kmEnd: 500 });
    const stored = getMileageEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].kmEnd).toBe(500);
  });

  it("upsertEntry keeps separate entries for different months/trucks", () => {
    upsertEntry({ truckId: "t1", month: "2026-04", kmStart: 100, kmEnd: 200 });
    upsertEntry({ truckId: "t1", month: "2026-05", kmStart: 200, kmEnd: 300 });
    upsertEntry({ truckId: "t2", month: "2026-04", kmStart: 0, kmEnd: 50 });
    expect(getMileageEntries()).toHaveLength(3);
  });
});

describe("buildRows", () => {
  const trucks: Truck[] = [makeTruck("t1", "CT-01-TML"), makeTruck("t2", "CT-02-TML")];

  it("falls back to truck.mileage when no entry exists", () => {
    const rows = buildRows(trucks, [], "2026-04", []);
    expect(rows[0].kmStart).toBe(100000);
    expect(rows[0].kmEnd).toBe(100000);
    expect(rows[0].kmDriven).toBe(0);
  });

  it("computes kmDriven from entry start/end", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 100000, kmEnd: 102500 },
    ];
    const rows = buildRows(trucks, [], "2026-04", entries);
    expect(rows[0].kmDriven).toBe(2500);
  });

  it("clamps negative kmDriven to 0", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 100, kmEnd: 50 },
    ];
    const rows = buildRows(trucks, [], "2026-04", entries);
    expect(rows[0].kmDriven).toBe(0);
  });

  it("sums kmTrips only for the selected month", () => {
    const trips: Trip[] = [
      makeTrip("tr1", "t1", "2026-04-05", 200, 100),
      makeTrip("tr2", "t1", "2026-04-15", 50, 25),
      makeTrip("tr3", "t1", "2026-05-01", 9999, 9999),
    ];
    const rows = buildRows(trucks, trips, "2026-04", []);
    expect(rows[0].kmTrips).toBe(200 + 100 + 50 + 25);
  });

  it("computes avgPerDay from kmDriven and days in month", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 0, kmEnd: 3000 },
    ];
    const rows = buildRows(trucks, [], "2026-04", entries);
    // April has 30 days
    expect(rows[0].avgPerDay).toBe(100);
  });

  it("flags hasAlert when discrepancy > 10%", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 0, kmEnd: 1000 },
    ];
    const trips: Trip[] = [makeTrip("tr1", "t1", "2026-04-05", 500, 0)];
    const rows = buildRows(trucks, trips, "2026-04", entries);
    expect(rows[0].discrepancyPct).toBeGreaterThan(0.1);
    expect(rows[0].hasAlert).toBe(true);
  });

  it("does not flag alert when discrepancy is within 10%", () => {
    const entries: MileageEntry[] = [
      { truckId: "t1", month: "2026-04", kmStart: 0, kmEnd: 1000 },
    ];
    const trips: Trip[] = [makeTrip("tr1", "t1", "2026-04-05", 950, 0)];
    const rows = buildRows(trucks, trips, "2026-04", entries);
    expect(rows[0].hasAlert).toBe(false);
  });

  it("returns one row per truck", () => {
    const rows = buildRows(trucks, [], "2026-04", []);
    expect(rows).toHaveLength(2);
  });
});

describe("buildChartData", () => {
  it("returns 12 months", () => {
    const data = buildChartData([makeTruck("t1", "CT-01-TML")], []);
    expect(data).toHaveLength(12);
  });

  it("includes a column per truck", () => {
    const data = buildChartData(
      [makeTruck("t1", "CT-01-TML"), makeTruck("t2", "CT-02-TML")],
      [],
    );
    expect(Object.keys(data[0])).toContain("CT-01-TML");
    expect(Object.keys(data[0])).toContain("CT-02-TML");
  });

  it("uses mm format for the month label", () => {
    const data = buildChartData([makeTruck("t1", "CT-01-TML")], []);
    expect(data[0].month).toMatch(/^\d{2}$/);
  });
});

describe("entrySchema", () => {
  it("accepts valid numeric km", () => {
    expect(entrySchema.safeParse({ kmStart: 100, kmEnd: 200 }).success).toBe(true);
  });

  it("coerces string numbers", () => {
    const result = entrySchema.safeParse({ kmStart: "100", kmEnd: "200" });
    expect(result.success).toBe(true);
  });

  it("rejects negative kmStart", () => {
    expect(entrySchema.safeParse({ kmStart: -1, kmEnd: 100 }).success).toBe(false);
  });
});
