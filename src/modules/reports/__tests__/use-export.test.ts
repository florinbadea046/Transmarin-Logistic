// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Unit tests: useExport hook
// File: src/modules/reports/hooks/useExport.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const m = vi.hoisted(() => ({
  save: vi.fn(),
  text: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  autoTable: vi.fn(),
  jsonToSheet: vi.fn(() => ({})),
  aoaToSheet: vi.fn(() => ({})),
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
    aoa_to_sheet: m.aoaToSheet,
    book_new: m.bookNew,
    book_append_sheet: m.bookAppendSheet,
  },
  writeFile: m.writeFile,
}));

vi.mock("papaparse", () => ({
  default: { unparse: m.unparse },
}));

import { useExport } from "@/modules/reports/hooks/useExport";

const cols = [
  { header: "Nume", key: "name" },
  { header: "Sumă", key: "amount" },
];
const rows = [
  { name: "Ion Popescu", amount: 5000 },
  { name: "Maria Pop", amount: 6000 },
];

describe("useExport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns three export functions from the hook", () => {
    const { result } = renderHook(() => useExport());
    expect(typeof result.current.exportPDF).toBe("function");
    expect(typeof result.current.exportExcel).toBe("function");
    expect(typeof result.current.exportCSV).toBe("function");
  });

  it("exportPDF calls jsPDF and autoTable", () => {
    const { result } = renderHook(() => useExport());
    result.current.exportPDF({
      filename: "report",
      title: "Raport Test",
      columns: cols,
      rows,
    });
    expect(m.autoTable).toHaveBeenCalledOnce();
    expect(m.save).toHaveBeenCalledWith("report.pdf");
  });

  it("exportPDF normalizes diacritics in title and rows", () => {
    const { result } = renderHook(() => useExport());
    result.current.exportPDF({
      filename: "report",
      title: "Raport Constanța",
      columns: [{ header: "Sucursală", key: "x" }],
      rows: [{ x: "București" }],
    });
    const args = m.autoTable.mock.calls[0][1] as { head: string[][]; body: string[][] };
    expect(args.head[0][0]).toBe("Sucursala");
    expect(args.body[0][0]).toBe("Bucuresti");
  });

  it("exportExcel uses aoa_to_sheet for layout", () => {
    const { result } = renderHook(() => useExport());
    result.current.exportExcel({
      filename: "report",
      title: "Raport",
      columns: cols,
      rows,
      sheetName: "Raport April",
    });
    expect(m.aoaToSheet).toHaveBeenCalledOnce();
    expect(m.writeFile).toHaveBeenCalledWith(expect.anything(), "report.xlsx");
  });

  it("exportExcel preserves diacritics (UTF-8 native)", () => {
    const { result } = renderHook(() => useExport());
    result.current.exportExcel({
      filename: "x",
      title: "Constanța",
      columns: [{ header: "Sucursală", key: "x" }],
      rows: [{ x: "București" }],
    });
    const data = m.aoaToSheet.mock.calls[0][0] as unknown as unknown[][];
    expect(data[1][0]).toBe("Constanța");
  });

  it("exportCSV calls Papa.unparse", () => {
    const { result } = renderHook(() => useExport());
    result.current.exportCSV({
      filename: "data",
      title: "x",
      columns: cols,
      rows,
    });
    expect(m.unparse).toHaveBeenCalledOnce();
  });
});
