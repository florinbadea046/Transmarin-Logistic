// ──────────────────────────────────────────────────────────
// Unit tests: Export utilities
// File: src/modules/accounting/pages/_components/invoices-export-utils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExportRows, exportPDF, exportExcel } from "@/modules/accounting/pages/_components/invoices-export-utils";
import type { Invoice } from "@/modules/accounting/pages/_components/invoices-types";

// Mock jsPDF
vi.mock("jspdf", () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  };
  return { default: class { constructor() { return mockDoc; } } };
});

vi.mock("jspdf-autotable", () => ({ default: vi.fn() }));

// Mock XLSX
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock papaparse
vi.mock("papaparse", () => ({
  default: { unparse: vi.fn(() => "col1,col2\nval1,val2") },
}));

// Mock URL si DOM pentru exportCSV
URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

const t = (key: string) => key;

const mockInvoices: Invoice[] = [
  {
    id: "1",
    nr: "FACT-2024-001",
    tip: "venit",
    data: "2024-01-10",
    scadenta: "2024-02-10",
    clientFurnizor: "SC Alpha SRL",
    linii: [{ id: "l1", descriere: "Transport marfa", cantitate: 2, pretUnitar: 2500 }],
    status: "plătită",
  },
  {
    id: "2",
    nr: "CHELT-2024-002",
    tip: "cheltuială",
    data: "2024-01-15",
    scadenta: "2024-02-15",
    clientFurnizor: "SC Beta SRL",
    linii: [{ id: "l2", descriere: "Combustibil", cantitate: 400, pretUnitar: 5 }],
    status: "neplatită",
  },
];

describe("invoices-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExportRows", () => {
    it("transforma facturile in format plat cu coloanele corecte", () => {
      const rows = getExportRows(mockInvoices, t);
      expect(rows).toHaveLength(2);
    });

    it("contine numarul facturii", () => {
      const rows = getExportRows(mockInvoices, t);
      const keys = Object.values(rows[0]);
      expect(keys).toContain("FACT-2024-001");
    });

    it("contine clientul/furnizorul", () => {
      const rows = getExportRows(mockInvoices, t);
      const values = Object.values(rows[0]);
      expect(values).toContain("SC Alpha SRL");
    });

    it("calculeaza corect subtotalul, TVA si totalul", () => {
      const rows = getExportRows(mockInvoices, t);
      // factura 1: 2 * 2500 = 5000, TVA 19% = 950, total = 5950
      const row = rows[0];
      const values = Object.values(row);
      expect(values).toContain("5000.00");
      expect(values).toContain("950.00");
      expect(values).toContain("5950.00");
    });

    it("returneaza array gol pentru liste goale", () => {
      const rows = getExportRows([], t);
      expect(rows).toHaveLength(0);
    });

    it("include data facturii", () => {
      const rows = getExportRows(mockInvoices, t);
      const values = Object.values(rows[0]);
      expect(values).toContain("2024-01-10");
    });
  });

  describe("exportPDF", () => {
    it("se apeleaza fara erori", () => {
      expect(() => exportPDF(mockInvoices, t)).not.toThrow();
    });

    it("apeleaza jsPDF si genereaza document", () => {
      expect(() => exportPDF(mockInvoices, t)).not.toThrow();
    });

    it("apeleaza autoTable pentru structura tabelului", async () => {
      const autoTable = (await import("jspdf-autotable")).default;
      await exportPDF(mockInvoices, t);
      expect(autoTable).toHaveBeenCalled();
    });
  });

  describe("exportExcel", () => {
    it("se apeleaza fara erori", () => {
      expect(() => exportExcel(mockInvoices, t)).not.toThrow();
    });

    it("apeleaza XLSX.utils.json_to_sheet", async () => {
      const XLSX = await import("xlsx");
      await exportExcel(mockInvoices, t);
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    });

    it("apeleaza XLSX.utils.book_append_sheet cu sheet name", async () => {
      const XLSX = await import("xlsx");
      await exportExcel(mockInvoices, t);
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.any(String),
      );
    });

    it("apeleaza XLSX.writeFile cu extensia .xlsx", async () => {
      const XLSX = await import("xlsx");
      await exportExcel(mockInvoices, t);
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining(".xlsx"),
      );
    });
  });

  describe("exportCSV", () => {
    it("apeleaza Papa.unparse cu datele corecte", async () => {
      const Papa = (await import("papaparse")).default;
      const rows = getExportRows(mockInvoices, t);
      Papa.unparse(rows);
      expect(Papa.unparse).toHaveBeenCalled();
    });

    it("getExportRows returneaza date valide pentru CSV", () => {
      const rows = getExportRows(mockInvoices, t);
      expect(rows.length).toBe(2);
      expect(Object.values(rows[0])).toContain("FACT-2024-001");
    });
  });
});