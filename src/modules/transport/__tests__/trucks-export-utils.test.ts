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
  unparse: vi.fn(() => "col1\nval1"),
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

import { exportTrucksPDF, exportTrucksExcel, exportTrucksCSV } from "@/modules/transport/pages/_components/trucks-export-utils";
import type { Driver, Truck } from "@/modules/transport/types";

const t = (k: string) => k;

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2026-12-01", rcaExpiry: "2026-11-01", vignetteExpiry: "2026-10-01" },
  { id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX", year: 2021, mileage: 80000, status: "in_service", itpExpiry: "2027-01-01", rcaExpiry: "2027-02-01", vignetteExpiry: "2027-03-01" },
];

const drivers: Driver[] = [
  { id: "d1", name: "Ion Popescu", phone: "0721234567", licenseExpiry: "2027-01-01", status: "on_trip", truckId: "t1" },
];

describe("exportTrucksPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes 9 columns", () => {
    exportTrucksPDF(trucks, drivers, t);
    const args = m.autoTable.mock.calls[0][1] as { head: string[][] };
    expect(args.head[0]).toHaveLength(9);
  });

  it("populates body with all trucks", () => {
    exportTrucksPDF(trucks, drivers, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    expect(args.body).toHaveLength(2);
  });

  it("resolves driver name for assigned truck", () => {
    exportTrucksPDF(trucks, drivers, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    const ct01 = args.body.find((r) => r.includes("CT-01-TML"));
    expect(ct01).toContain("Ion Popescu");
  });

  it("shows dash for trucks with no driver", () => {
    exportTrucksPDF(trucks, drivers, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    const ct02 = args.body.find((r) => r.includes("CT-02-TML"));
    expect(ct02).toContain("—");
  });
});

describe("exportTrucksExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates xlsx sheet", () => {
    exportTrucksExcel(trucks, drivers, t);
    expect(m.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(".xlsx"));
  });

  it("includes year and mileage as values", () => {
    exportTrucksExcel(trucks, drivers, t);
    const rows = m.jsonToSheet.mock.calls[0][0] as Record<string, unknown>[];
    const ct01 = rows.find((r) => r["trucks.columns.plateNumber"] === "CT-01-TML");
    expect(ct01?.["trucks.fields.year"]).toBe(2020);
  });
});

describe("exportTrucksCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Papa.unparse", () => {
    exportTrucksCSV(trucks, drivers, t);
    expect(m.unparse).toHaveBeenCalledOnce();
  });
});
