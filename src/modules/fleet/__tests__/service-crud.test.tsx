// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: ServiceCRUD (smoke + storage rendering)
// File: src/modules/fleet/components/ServiceCRUD.tsx
// Pure utils covered separately in service-utils.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/modules/fleet/utils/exportPDF", () => ({
  exportServiceToPDF: vi.fn(),
}));

import { ServiceCRUD } from "@/modules/fleet/components/ServiceCRUD";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { ServiceRecord, Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2027-01-01", rcaExpiry: "2027-01-01", vignetteExpiry: "2027-01-01" },
];

const parts: Part[] = [
  { id: "p1", name: "Filter Bosch", category: "engine", code: "FB-001", quantity: 10, unitPrice: 50, supplier: "Bosch", minStock: 5 },
];

const services: ServiceRecord[] = [
  { id: "s1", truckId: "t1", date: "2026-03-15", type: "revision", description: "Revizie 100k", mileageAtService: 100000, cost: 1500, nextServiceDate: "2026-09-15", partsUsed: [{ partId: "p1", quantity: 2 }] },
  { id: "s2", truckId: "t1", date: "2026-04-01", type: "repair", description: "Schimb pompa apa", mileageAtService: 105000, cost: 800, partsUsed: [] },
];

describe("ServiceCRUD", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.trucks, trucks);
    setCollection(STORAGE_KEYS.parts, parts);
    setCollection(STORAGE_KEYS.serviceRecords, services);
  });

  it("renders without crashing", () => {
    expect(() =>
      render(<ServiceCRUD records={services} trucks={trucks} onRecordsChange={vi.fn()} />),
    ).not.toThrow();
  });

  it("renders all service records", () => {
    render(<ServiceCRUD records={services} trucks={trucks} onRecordsChange={vi.fn()} />);
    expect(screen.getByText("Revizie 100k")).toBeInTheDocument();
    expect(screen.getByText("Schimb pompa apa")).toBeInTheDocument();
  });

  it("renders truck plate associated with services", () => {
    render(<ServiceCRUD records={services} trucks={trucks} onRecordsChange={vi.fn()} />);
    expect(screen.getAllByText(/CT-01-TML/).length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty service list gracefully", () => {
    render(<ServiceCRUD records={[]} trucks={trucks} onRecordsChange={vi.fn()} />);
    expect(screen.queryByText("Revizie 100k")).not.toBeInTheDocument();
  });
});
