// ──────────────────────────────────────────────────────────
// Unit tests: Financial report utilities
// File: src/modules/reports/pages/_components/financial-reports-utils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  COLORS,
  formatCurrency,
  stripDiacritics,
  buildBarData,
  buildPieData,
  statusColors,
} from "@/modules/reports/pages/_components/financial-reports-utils";
import type { Invoice } from "@/modules/accounting/types";
import type { TFunction } from "i18next";

const t = ((k: string) => k) as unknown as TFunction;

const makeInvoice = (
  id: string,
  type: "income" | "expense",
  date: string,
  total: number,
  items: { description: string; total: number }[] = [],
  clientName = "Client",
): Invoice => ({
  id,
  type,
  number: `F-${id}`,
  date,
  dueDate: date,
  clientName,
  items: items.map((it) => ({ description: it.description, quantity: 1, unitPrice: it.total, total: it.total })),
  totalWithoutVAT: total / 1.19,
  vat: total - total / 1.19,
  total,
  status: "draft",
});

describe("formatCurrency", () => {
  it("formats with RON currency", () => {
    expect(formatCurrency(1234)).toMatch(/RON/i);
  });

  it("uses 2 decimals", () => {
    const out = formatCurrency(10);
    expect(out).toMatch(/10[,.]00/);
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toMatch(/0/);
  });
});

describe("stripDiacritics (financial-reports-utils)", () => {
  it("strips ș/ț to s/t for lowercase", () => {
    expect(stripDiacritics("Constanța")).toBe("Constanta");
    expect(stripDiacritics("Iași")).toBe("Iasi");
  });

  it("converts ă/â/î to ASCII (legacy implementation)", () => {
    expect(stripDiacritics("ăâî")).toBe("aai");
    expect(stripDiacritics("ĂÂÎ")).toBe("AAI");
  });
});

describe("COLORS", () => {
  it("provides at least 6 colors for charts", () => {
    expect(COLORS.length).toBeGreaterThanOrEqual(6);
  });

  it("colors are valid hex values", () => {
    COLORS.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });
});

describe("statusColors", () => {
  it("has class strings for all 4 statuses", () => {
    expect(statusColors.paid).toContain("green");
    expect(statusColors.sent).toContain("blue");
    expect(statusColors.overdue).toContain("red");
    expect(statusColors.draft).toContain("gray");
  });
});

describe("buildBarData", () => {
  it("returns empty array for no invoices", () => {
    expect(buildBarData([])).toEqual([]);
  });

  it("groups invoices by month YYYY-MM", () => {
    const data = buildBarData([
      makeInvoice("1", "income", "2026-04-10", 1000),
      makeInvoice("2", "income", "2026-04-20", 500),
      makeInvoice("3", "income", "2026-05-01", 200),
    ]);
    expect(data).toHaveLength(2);
    expect(data[0].luna).toBe("2026-04");
    expect(data[0].venituri).toBe(1500);
    expect(data[1].luna).toBe("2026-05");
  });

  it("separates income and expense per month", () => {
    const data = buildBarData([
      makeInvoice("1", "income", "2026-04-10", 1000),
      makeInvoice("2", "expense", "2026-04-15", 300),
    ]);
    expect(data[0].venituri).toBe(1000);
    expect(data[0].cheltuieli).toBe(300);
  });

  it("sorts by month ascending", () => {
    const data = buildBarData([
      makeInvoice("3", "income", "2026-06-01", 100),
      makeInvoice("1", "income", "2026-04-01", 100),
      makeInvoice("2", "income", "2026-05-01", 100),
    ]);
    expect(data.map((d) => d.luna)).toEqual(["2026-04", "2026-05", "2026-06"]);
  });
});

describe("buildPieData", () => {
  it("returns empty for no expense invoices", () => {
    expect(buildPieData([], t)).toEqual([]);
    expect(buildPieData([makeInvoice("1", "income", "2026-04-01", 1000)], t)).toEqual([]);
  });

  it("categorizes 'combustibil' as fuel", () => {
    const data = buildPieData(
      [makeInvoice("1", "expense", "2026-04-01", 100, [{ description: "Combustibil", total: 100 }])],
      t,
    );
    expect(data[0].name).toBe("financialReports.pie.fuel");
  });

  it("categorizes 'piese' as maintenance", () => {
    const data = buildPieData(
      [makeInvoice("1", "expense", "2026-04-01", 100, [{ description: "Piese auto", total: 100 }])],
      t,
    );
    expect(data[0].name).toBe("financialReports.pie.maintenance");
  });

  it("categorizes 'salariu' as salaries", () => {
    const data = buildPieData(
      [makeInvoice("1", "expense", "2026-04-01", 5000, [{ description: "Salariu Aprilie", total: 5000 }])],
      t,
    );
    expect(data[0].name).toBe("financialReports.pie.salaries");
  });

  it("limits results to top 6 categories sorted desc", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      description: `Other-${i}`,
      total: (10 - i) * 100,
    }));
    const inv = makeInvoice("1", "expense", "2026-04-01", 5500, items, "");
    const data = buildPieData([inv], t);
    expect(data.length).toBeLessThanOrEqual(6);
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].value).toBeGreaterThanOrEqual(data[i + 1].value);
    }
  });
});
