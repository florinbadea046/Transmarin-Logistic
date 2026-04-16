import { describe, it, expect } from "vitest";
import {
  ALERT_THRESHOLD,
  CHART_COLORS,
  buildTruckRecordsMap,
  getConsumption,
  buildChartData,
} from "@/modules/fleet/utils/fuelUtils";
import type { FuelRecord } from "@/modules/fleet/types";

describe("constants", () => {
  it("ALERT_THRESHOLD is 35", () => {
    expect(ALERT_THRESHOLD).toBe(35);
  });

  it("CHART_COLORS has 3 colors", () => {
    expect(CHART_COLORS).toHaveLength(3);
  });
});

describe("buildTruckRecordsMap", () => {
  it("groups records by truckId", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
      { id: "f2", truckId: "t2", date: "2026-04-01", liters: 150, cost: 1050, mileage: 5000 },
      { id: "f3", truckId: "t1", date: "2026-04-05", liters: 80, cost: 560, mileage: 10500 },
    ];
    const map = buildTruckRecordsMap(records);
    expect(map["t1"]).toHaveLength(2);
    expect(map["t2"]).toHaveLength(1);
  });

  it("sorts each truck records by mileage ascending", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-10", liters: 100, cost: 700, mileage: 10500 },
      { id: "f2", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
    ];
    const map = buildTruckRecordsMap(records);
    expect(map["t1"][0].mileage).toBe(10000);
    expect(map["t1"][1].mileage).toBe(10500);
  });

  it("returns empty object for no records", () => {
    expect(buildTruckRecordsMap([])).toEqual({});
  });
});

describe("getConsumption", () => {
  it("returns null for first record (no previous)", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
    ];
    expect(getConsumption(records[0], records)).toBeNull();
  });

  it("computes L/100km from previous record", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
      { id: "f2", truckId: "t1", date: "2026-04-10", liters: 30, cost: 210, mileage: 10100 },
    ];
    // 30L over 100km = 30 L/100km
    expect(getConsumption(records[1], records)).toBe("30.0");
  });

  it("returns null when km did not advance", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
      { id: "f2", truckId: "t1", date: "2026-04-10", liters: 30, cost: 210, mileage: 10000 },
    ];
    expect(getConsumption(records[1], records)).toBeNull();
  });
});

describe("buildChartData", () => {
  it("returns empty array when no fuel records", () => {
    expect(buildChartData([], [{ id: "t1", plateNumber: "CT-01" }])).toEqual([]);
  });

  it("computes per-refuel consumption per truck plate", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
      { id: "f2", truckId: "t1", date: "2026-04-10", liters: 30, cost: 210, mileage: 10100 },
    ];
    const trucks = [{ id: "t1", plateNumber: "CT-01" }];
    const data = buildChartData(records, trucks);
    expect(data).toHaveLength(1);
    expect(data[0]["CT-01"]).toBeCloseTo(30, 1);
  });

  it("skips non-advancing km segments", () => {
    const records: FuelRecord[] = [
      { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
      { id: "f2", truckId: "t1", date: "2026-04-10", liters: 30, cost: 210, mileage: 10000 },
    ];
    const data = buildChartData(records, [{ id: "t1", plateNumber: "CT-01" }]);
    expect(data).toHaveLength(0);
  });
});
