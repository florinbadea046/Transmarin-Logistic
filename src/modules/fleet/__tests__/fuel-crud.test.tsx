// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: FuelCRUD (smoke + storage rendering)
// File: src/modules/fleet/components/FuelCRUD.tsx
// Pure utils covered separately in fuelUtils.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/modules/fleet/utils/exportCSV", () => ({
  exportFuelToCSV: vi.fn(),
}));

import { FuelCRUD } from "@/modules/fleet/components/FuelCRUD";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { FuelRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2027-01-01", rcaExpiry: "2027-01-01", vignetteExpiry: "2027-01-01" },
];

const records: FuelRecord[] = [
  { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
  { id: "f2", truckId: "t1", date: "2026-04-10", liters: 80, cost: 560, mileage: 10300 },
];

describe("FuelCRUD", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.trucks, trucks);
    setCollection(STORAGE_KEYS.fuelRecords, records);
  });

  it("renders without crashing", () => {
    expect(() => render(<FuelCRUD />)).not.toThrow();
  });

  it("renders all fuel records", () => {
    render(<FuelCRUD />);
    expect(screen.getByText("2026-04-01")).toBeInTheDocument();
    expect(screen.getByText("2026-04-10")).toBeInTheDocument();
  });

  it("renders truck plate references", () => {
    render(<FuelCRUD />);
    expect(screen.getAllByText(/CT-01-TML/).length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty records gracefully", () => {
    setCollection<FuelRecord>(STORAGE_KEYS.fuelRecords, []);
    render(<FuelCRUD />);
    expect(screen.queryByText("2026-04-01")).not.toBeInTheDocument();
  });
});
