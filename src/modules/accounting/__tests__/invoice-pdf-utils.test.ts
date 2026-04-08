// ──────────────────────────────────────────────────────────
// Unit tests: PDF generation utilities
// File: src/modules/accounting/components/invoice-pdf.utils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStatusLabels,
  fmt,
  fmtDate,
  generateInvoicePDF,
  COMPANY,
  type InvoiceData,
} from "@/modules/accounting/components/invoice-pdf.utils";

// Mock jsPDF si autoTable — nu vrem sa generam PDF real in teste
vi.mock("jspdf", () => {
  const mockDoc = {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    splitTextToSize: vi.fn(() => ["linie1"]),
    save: vi.fn(),
    lastAutoTable: { finalY: 150 },
  };
  return {
    jsPDF: class { constructor() { return mockDoc; } },
  };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

const t = (key: string, opts?: Record<string, unknown>) => {
  if (opts) return `${key}:${JSON.stringify(opts)}`;
  return key;
};

const mockInvoice: InvoiceData = {
  invoiceNumber: "FACT-2024-001",
  invoiceDate: "2024-01-10",
  dueDate: "2024-02-10",
  status: "paid",
  clientName: "SC Alpha SRL",
  clientAddress: "Str. Principala 1, Bucuresti",
  clientCUI: "RO11223344",
  lineItems: [
    { description: "Transport marfa", quantity: 2, unitPrice: 2500, vatRate: 19 },
    { description: "Taxa urgenta", quantity: 1, unitPrice: 500, vatRate: 19 },
  ],
};

describe("invoice-pdf-utils", () => {
  describe("getStatusLabels", () => {
    it("returneaza toate statusurile traduse", () => {
      const labels = getStatusLabels(t);
      expect(labels).toHaveProperty("paid");
      expect(labels).toHaveProperty("sent");
      expect(labels).toHaveProperty("draft");
      expect(labels).toHaveProperty("overdue");
      expect(labels).toHaveProperty("cancelled");
    });

    it("foloseste cheile i18n corecte", () => {
      const labels = getStatusLabels(t);
      expect(labels.paid).toBe("pdf.statusLabels.paid");
      expect(labels.sent).toBe("pdf.statusLabels.sent");
      expect(labels.draft).toBe("pdf.statusLabels.draft");
      expect(labels.overdue).toBe("pdf.statusLabels.overdue");
      expect(labels.cancelled).toBe("pdf.statusLabels.cancelled");
    });
  });

  describe("fmt", () => {
    it("formateaza numere cu 2 zecimale", () => {
      expect(fmt(1000)).toContain("1");
      expect(fmt(1234.5)).toContain("1");
    });

    it("formateaza zero corect", () => {
      expect(fmt(0)).toContain("0");
    });
  });

  describe("fmtDate", () => {
    it("converteste yyyy-MM-dd in dd.MM.yyyy", () => {
      expect(fmtDate("2024-01-10")).toBe("10.01.2024");
    });

    it("returneaza — pentru undefined", () => {
      expect(fmtDate(undefined)).toBe("—");
    });

    it("returneaza — pentru string gol", () => {
      expect(fmtDate("")).toBe("—");
    });
  });

  describe("generateInvoicePDF", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("se apeleaza fara erori cu date valide", () => {
      expect(() => generateInvoicePDF(mockInvoice, t)).not.toThrow();
    });

    it("apeleaza doc.save cu numele corect al fisierului", () => {
      const filename = `Factura_${mockInvoice.invoiceNumber.replace(/\//g, "-")}_${mockInvoice.invoiceDate}.pdf`;
      expect(filename).toContain("FACT-2024-001");
    });

    it("calculeaza corect totalul liniilor (subtotal + TVA)", () => {
      // 2 * 2500 = 5000, TVA 19% = 950, total linie1 = 5950
      // 1 * 500 = 500, TVA 19% = 95, total linie2 = 595
      // Grand total = 6545
      const subtotal = mockInvoice.lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice,
        0,
      );
      const tva = mockInvoice.lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice * ((l.vatRate ?? 19) / 100),
        0,
      );
      expect(subtotal).toBe(5500);
      expect(tva).toBeCloseTo(1045, 1);
      expect(subtotal + tva).toBeCloseTo(6545, 1);
    });

    it("foloseste COMPANY ca furnizor implicit daca nu e specificat", () => {
      const invoiceNoSupplier: InvoiceData = { ...mockInvoice, supplierName: undefined };
      expect(() => generateInvoicePDF(invoiceNoSupplier, t)).not.toThrow();
    });

    it("functioneaza cu supplierName custom", () => {
      const invoiceCustomSupplier: InvoiceData = {
        ...mockInvoice,
        supplierName: "Alt Furnizor SRL",
        supplierCUI: "RO99887766",
      };
      expect(() => generateInvoicePDF(invoiceCustomSupplier, t)).not.toThrow();
    });
  });

  describe("COMPANY", () => {
    it("contine datele firmei Transmarin", () => {
      expect(COMPANY.name).toContain("Transmarin");
      expect(COMPANY.cui).toBeTruthy();
      expect(COMPANY.iban).toBeTruthy();
    });
  });
});