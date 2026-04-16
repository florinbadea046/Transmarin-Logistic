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

import { exportDriversPDF, exportDriversExcel, exportDriversCSV } from "@/modules/transport/pages/_components/drivers-export-utils";
import type { Driver, Truck } from "@/modules/transport/types";

const t = (k: string) => k;

const drivers: Driver[] = [
  { id: "d1", name: "Ion Popescu", phone: "0721234567", licenseExpiry: "2027-01-01", status: "available", truckId: "t1" },
  { id: "d2", name: "Maria Pop", phone: "0721234568", licenseExpiry: "2026-12-01", status: "on_trip" },
];

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "on_trip", itpExpiry: "2026-12-01", rcaExpiry: "2026-11-01", vignetteExpiry: "2026-10-01" },
];

describe("exportDriversPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls autoTable with 5 columns", async () => {
    await exportDriversPDF(drivers, trucks, t);
    expect(m.autoTable).toHaveBeenCalledOnce();
    const args = m.autoTable.mock.calls[0][1] as { head: string[][] };
    expect(args.head[0]).toHaveLength(5);
  });

  it("populates body with driver data", async () => {
    await exportDriversPDF(drivers, trucks, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    expect(args.body).toHaveLength(2);
    expect(args.body[0]).toContain("Ion Popescu");
  });

  it("resolves linked truck plate", async () => {
    await exportDriversPDF(drivers, trucks, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    const ionRow = args.body.find((r) => r.includes("Ion Popescu"));
    expect(ionRow).toContain("CT-01-TML");
  });

  it("uses dash for unassigned driver truck", async () => {
    await exportDriversPDF(drivers, trucks, t);
    const args = m.autoTable.mock.calls[0][1] as { body: string[][] };
    const mariaRow = args.body.find((r) => r.includes("Maria Pop"));
    expect(mariaRow).toContain("—");
  });

  it("saves with .pdf filename", async () => {
    await exportDriversPDF(drivers, trucks, t);
    expect(m.save).toHaveBeenCalledWith(expect.stringContaining(".pdf"));
  });
});

describe("exportDriversExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls XLSX.writeFile with .xlsx extension", async () => {
    await exportDriversExcel(drivers, trucks, t);
    expect(m.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining(".xlsx"),
    );
  });

  it("creates a sheet with translated columns", async () => {
    await exportDriversExcel(drivers, trucks, t);
    expect(m.jsonToSheet).toHaveBeenCalledOnce();
    const rows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0])).toContain("drivers.columns.name");
  });
});

describe("exportDriversCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Papa.unparse with normalized rows", async () => {
    await exportDriversCSV(drivers, trucks, t);
    expect(m.unparse).toHaveBeenCalledOnce();
  });
});
