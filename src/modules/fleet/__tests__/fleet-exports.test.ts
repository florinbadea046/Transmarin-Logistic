// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  save: vi.fn(),
  text: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  autoTable: vi.fn(),
  jsonToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
  unparse: vi.fn(() => "x\n1"),
}));

vi.mock("jspdf", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.setFontSize = m.setFontSize;
    this.text = m.text;
    this.setTextColor = m.setTextColor;
    this.setFont = m.setFont;
    this.save = m.save;
  }),
}));

vi.mock("jspdf-autotable", () => ({ default: m.autoTable }));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: m.jsonToSheet,
    book_new: m.bookNew,
    book_append_sheet: m.bookAppendSheet,
  },
  writeFile: m.writeFile,
}));

vi.mock("papaparse", () => ({
  default: { unparse: m.unparse },
}));

import { exportFuelToCSV } from "@/modules/fleet/utils/exportCSV";
import { exportPartsToExcel } from "@/modules/fleet/utils/exportExcel";
import { exportServiceToPDF } from "@/modules/fleet/utils/exportPDF";
import type { FuelRecord, Part, ServiceRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

const t = (k: string) => k;

const fuelRecords: FuelRecord[] = [
  { id: "f1", truckId: "t1", date: "2026-04-01", liters: 100, cost: 700, mileage: 10000 },
];

const parts: Part[] = [
  { id: "p1", code: "P-0001", name: "Filter", category: "engine", supplier: "Bosch", unitPrice: 50, quantity: 10, minStock: 5 },
  { id: "p2", code: "P-0002", name: "Tire", category: "wheels", supplier: "Michelin", unitPrice: 200, quantity: 2, minStock: 4 },
];

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2026-12-01", rcaExpiry: "2026-11-01", vignetteExpiry: "2026-10-01" },
];

const services: ServiceRecord[] = [
  { id: "s1", truckId: "t1", date: "2026-03-15", type: "revision", description: "Revizie 100k", mileageAtService: 100000, cost: 1500, nextServiceDate: "2026-09-15", partsUsed: [] },
];

describe("exportFuelToCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Papa.unparse with rows", () => {
    exportFuelToCSV(fuelRecords, trucks, t);
    expect(m.unparse).toHaveBeenCalledOnce();
  });

  it("resolves truck label from truckId", () => {
    exportFuelToCSV(fuelRecords, trucks, t);
    // exportToCsv builds rows of {header: value} objects internally
    // Verify the CSV unparse received data with the truck label
    const calls = m.unparse.mock.calls[0];
    expect(JSON.stringify(calls)).toContain("CT-01-TML");
  });
});

describe("exportPartsToExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates xlsx with all parts", () => {
    exportPartsToExcel(parts, t);
    expect(m.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(".xlsx"));
    expect(m.jsonToSheet).toHaveBeenCalledOnce();
  });

  it("flags low-stock parts in stock status column", () => {
    exportPartsToExcel(parts, t);
    const rows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    const tire = rows.find((r) => r["fleet.parts.exportColumnName"] === "Tire");
    expect(tire?.["fleet.parts.exportColumnStockStatus"]).toBe("fleet.parts.exportStockLow");
  });

  it("marks ok-stock parts", () => {
    exportPartsToExcel(parts, t);
    const rows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    const filter = rows.find((r) => r["fleet.parts.exportColumnName"] === "Filter");
    expect(filter?.["fleet.parts.exportColumnStockStatus"]).toBe("fleet.parts.exportStockOk");
  });
});

describe("exportServiceToPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls autoTable with rows + footer", () => {
    exportServiceToPDF(services, trucks, t);
    expect(m.autoTable).toHaveBeenCalledOnce();
    const args = m.autoTable.mock.calls[0][1] as { foot?: unknown[][]; body: unknown[][] };
    expect(args.body).toHaveLength(1);
    expect(args.foot).toBeDefined();
  });

  it("filters by truckId", () => {
    const services2: ServiceRecord[] = [
      ...services,
      { id: "s2", truckId: "t-other", date: "2026-03-15", type: "revision", description: "x", mileageAtService: 100, cost: 100, nextServiceDate: "", partsUsed: [] },
    ];
    exportServiceToPDF(services2, trucks, t, { truckId: "t1" });
    const args = m.autoTable.mock.calls[0][1] as { body: unknown[][] };
    expect(args.body).toHaveLength(1);
  });

  it("filters by date range", () => {
    const services2: ServiceRecord[] = [
      { id: "s1", truckId: "t1", date: "2026-01-15", type: "revision", description: "", mileageAtService: 0, cost: 0, nextServiceDate: "", partsUsed: [] },
      { id: "s2", truckId: "t1", date: "2026-06-15", type: "revision", description: "", mileageAtService: 0, cost: 0, nextServiceDate: "", partsUsed: [] },
    ];
    exportServiceToPDF(services2, trucks, t, { fromDate: "2026-05-01" });
    const args = m.autoTable.mock.calls[0][1] as { body: unknown[][] };
    expect(args.body).toHaveLength(1);
  });

  it("saves with date-stamped filename", () => {
    exportServiceToPDF(services, trucks, t);
    expect(m.save).toHaveBeenCalledWith(expect.stringMatching(/registru-service-\d{4}-\d{2}-\d{2}\.pdf$/));
  });
});
