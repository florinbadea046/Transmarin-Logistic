import { describe, it, expect, vi } from "vitest";
import {
  generateNr,
  calcLineTotals,
  formatCurrency,
  emptyLine,
  defaultForm,
  initialMock,
} from "@/modules/accounting/pages/_components/invoices-utils";
import { FURNIZORI } from "@/modules/accounting/pages/_components/invoices-types";

describe("generateNr", () => {
  it("uses FACT prefix for 'venit'", () => {
    const nr = generateNr("venit");
    expect(nr.startsWith(`FACT-${new Date().getFullYear()}-`)).toBe(true);
  });

  it("uses CHELT prefix for 'cheltuială'", () => {
    const nr = generateNr("cheltuială");
    expect(nr.startsWith(`CHELT-${new Date().getFullYear()}-`)).toBe(true);
  });

  it("appends a 3-digit number", () => {
    const nr = generateNr("venit");
    const parts = nr.split("-");
    expect(parts[2]).toMatch(/^\d{3}$/);
  });

  it("includes current year", () => {
    const year = String(new Date().getFullYear());
    expect(generateNr("venit")).toContain(year);
  });
});

describe("calcLineTotals", () => {
  it("returns zeros for empty list", () => {
    expect(calcLineTotals([])).toEqual({ totalFaraTVA: 0, tva: 0, total: 0 });
  });

  it("computes subtotal, 19% VAT, and grand total", () => {
    const result = calcLineTotals([
      { id: "l1", descriere: "x", cantitate: 2, pretUnitar: 100 },
    ]);
    expect(result.totalFaraTVA).toBe(200);
    expect(result.tva).toBeCloseTo(38, 5);
    expect(result.total).toBeCloseTo(238, 5);
  });

  it("sums multiple lines", () => {
    const result = calcLineTotals([
      { id: "l1", descriere: "a", cantitate: 1, pretUnitar: 100 },
      { id: "l2", descriere: "b", cantitate: 3, pretUnitar: 50 },
    ]);
    expect(result.totalFaraTVA).toBe(250);
  });

  it("handles fractional quantities and prices", () => {
    const result = calcLineTotals([
      { id: "l1", descriere: "fuel", cantitate: 12.5, pretUnitar: 7.99 },
    ]);
    expect(result.totalFaraTVA).toBeCloseTo(99.875, 5);
    expect(result.total).toBeCloseTo(99.875 * 1.19, 5);
  });
});

describe("formatCurrency", () => {
  it("formats with RON currency symbol", () => {
    const out = formatCurrency(1234.56);
    expect(out).toContain("1");
    expect(out).toMatch(/RON/i);
  });

  it("handles zero", () => {
    const out = formatCurrency(0);
    expect(out).toMatch(/0/);
  });

  it("handles negative", () => {
    const out = formatCurrency(-100);
    expect(out).toContain("-");
  });
});

describe("emptyLine", () => {
  it("creates a line with default values", () => {
    const line = emptyLine();
    expect(line.id).toBeTruthy();
    expect(line.descriere).toBe("");
    expect(line.cantitate).toBe(1);
    expect(line.pretUnitar).toBe(0);
  });

  it("generates unique ids per call", () => {
    expect(emptyLine().id).not.toBe(emptyLine().id);
  });
});

describe("defaultForm", () => {
  it("starts with type 'venit'", () => {
    expect(defaultForm().tip).toBe("venit");
  });

  it("date defaults to today (yyyy-MM-dd)", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(defaultForm().data).toBe(today);
  });

  it("clientFurnizor defaults to first FURNIZORI entry", () => {
    expect(defaultForm().clientFurnizor).toBe(FURNIZORI[0]);
  });

  it("contains exactly one empty line", () => {
    expect(defaultForm().linii).toHaveLength(1);
  });

  it("status defaults to 'neplatită'", () => {
    expect(defaultForm().status).toBe("neplatită");
  });
});

describe("initialMock", () => {
  it("contains 3 sample invoices", () => {
    expect(initialMock).toHaveLength(3);
  });

  it("has one income, one expense, and one with multiple lines", () => {
    expect(initialMock.some((i) => i.tip === "venit")).toBe(true);
    expect(initialMock.some((i) => i.tip === "cheltuială")).toBe(true);
    expect(initialMock.some((i) => i.linii.length > 1)).toBe(true);
  });
});
