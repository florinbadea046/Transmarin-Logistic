import { describe, it, expect } from "vitest";
import { calcLineTotals, generateNr } from "../pages/_components/invoices-utils";

const mockInvoice = {
  id: "1",
  nr: "FACT-2024-001",
  tip: "venit" as const,
  data: "2024-01-10",
  scadenta: "2024-02-10",
  clientFurnizor: "SC Alpha SRL",
  linii: [
    { id: "l1", descriere: "Transport marfă", cantitate: 2, pretUnitar: 2500 },
  ],
  status: "plătită" as const,
};

describe("calcLineTotals", () => {
  it("calculează corect totalFaraTVA pentru o linie", () => {
    const linii = [{ id: "1", descriere: "Test", cantitate: 2, pretUnitar: 100 }];
    const { totalFaraTVA } = calcLineTotals(linii);
    expect(totalFaraTVA).toBe(200);
  });

  it("calculează corect TVA de 19%", () => {
    const linii = [{ id: "1", descriere: "Test", cantitate: 1, pretUnitar: 100 }];
    const { tva } = calcLineTotals(linii);
    expect(tva).toBe(19);
  });

  it("calculează corect totalul cu TVA", () => {
    const linii = [{ id: "1", descriere: "Test", cantitate: 1, pretUnitar: 100 }];
    const { total } = calcLineTotals(linii);
    expect(total).toBe(119);
  });

  it("calculează corect pentru mai multe linii", () => {
    const linii = [
      { id: "1", descriere: "Linia 1", cantitate: 2, pretUnitar: 100 },
      { id: "2", descriere: "Linia 2", cantitate: 3, pretUnitar: 200 },
    ];
    const { totalFaraTVA, tva, total } = calcLineTotals(linii);
    expect(totalFaraTVA).toBe(800);
    expect(tva).toBeCloseTo(152, 5);
    expect(total).toBeCloseTo(952, 5);
  });

  it("returnează 0 pentru lista goală", () => {
    const { totalFaraTVA, tva, total } = calcLineTotals([]);
    expect(totalFaraTVA).toBe(0);
    expect(tva).toBe(0);
    expect(total).toBe(0);
  });

  it("calculează corect pentru cantitate 0", () => {
    const linii = [{ id: "1", descriere: "Test", cantitate: 0, pretUnitar: 500 }];
    const { totalFaraTVA } = calcLineTotals(linii);
    expect(totalFaraTVA).toBe(0);
  });

  it("totalul este suma dintre totalFaraTVA și tva", () => {
    const linii = [{ id: "1", descriere: "Test", cantitate: 5, pretUnitar: 300 }];
    const { totalFaraTVA, tva, total } = calcLineTotals(linii);
    expect(total).toBeCloseTo(totalFaraTVA + tva, 10);
  });
});

describe("generateNr", () => {
  it("generează prefix FACT pentru tip venit", () => {
    const nr = generateNr("venit");
    expect(nr).toMatch(/^FACT-/);
  });

  it("generează prefix CHELT pentru tip cheltuială", () => {
    const nr = generateNr("cheltuială");
    expect(nr).toMatch(/^CHELT-/);
  });

  it("conține anul curent", () => {
    const an = new Date().getFullYear().toString();
    const nr = generateNr("venit");
    expect(nr).toContain(an);
  });

  it("are formatul corect FACT-YYYY-NNN", () => {
    const nr = generateNr("venit");
    expect(nr).toMatch(/^FACT-\d{4}-\d{3}$/);
  });

  it("are formatul corect CHELT-YYYY-NNN", () => {
    const nr = generateNr("cheltuială");
    expect(nr).toMatch(/^CHELT-\d{4}-\d{3}$/);
  });

  it("numărul secvențial este între 100 și 999", () => {
    const nr = generateNr("venit");
    const seq = parseInt(nr.split("-")[2]);
    expect(seq).toBeGreaterThanOrEqual(100);
    expect(seq).toBeLessThanOrEqual(999);
  });

  it("generează numere diferite la apeluri consecutive", () => {
    const results = new Set(Array.from({ length: 20 }, () => generateNr("venit")));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("Filter logic", () => {
  const invoices = [
    { ...mockInvoice, id: "1", tip: "venit" as const, status: "plătită" as const, nr: "FACT-001", clientFurnizor: "SC Alpha SRL" },
    { ...mockInvoice, id: "2", tip: "cheltuială" as const, status: "neplatită" as const, nr: "CHELT-002", clientFurnizor: "SC Beta SRL" },
    { ...mockInvoice, id: "3", tip: "venit" as const, status: "parțial" as const, nr: "FACT-003", clientFurnizor: "SC Gamma SA" },
  ];

  const filterInvoices = (
    list: typeof invoices,
    tipFilter: string,
    statusFilter: string,
    search: string
  ) => {
    const q = search.toLowerCase();
    return list.filter((inv) => {
      const matchTip = tipFilter === "toate" || inv.tip === tipFilter;
      const matchStatus = statusFilter === "toate" || inv.status === statusFilter;
      const matchSearch = !q || inv.nr.toLowerCase().includes(q) || inv.clientFurnizor.toLowerCase().includes(q);
      return matchTip && matchStatus && matchSearch;
    });
  };

  it("fără filtre returnează toate facturile", () => {
    expect(filterInvoices(invoices, "toate", "toate", "")).toHaveLength(3);
  });

  it("filtrează după tip venit", () => {
    const result = filterInvoices(invoices, "venit", "toate", "");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.tip === "venit")).toBe(true);
  });

  it("filtrează după tip cheltuială", () => {
    const result = filterInvoices(invoices, "cheltuială", "toate", "");
    expect(result).toHaveLength(1);
    expect(result[0].tip).toBe("cheltuială");
  });

  it("filtrează după status plătită", () => {
    const result = filterInvoices(invoices, "toate", "plătită", "");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("plătită");
  });

  it("filtrează după status neplatită", () => {
    const result = filterInvoices(invoices, "toate", "neplatită", "");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("neplatită");
  });

  it("filtrează după search pe numărul facturii", () => {
    const result = filterInvoices(invoices, "toate", "toate", "FACT-001");
    expect(result).toHaveLength(1);
    expect(result[0].nr).toBe("FACT-001");
  });

  it("filtrează după search pe client/furnizor", () => {
    const result = filterInvoices(invoices, "toate", "toate", "Beta");
    expect(result).toHaveLength(1);
    expect(result[0].clientFurnizor).toBe("SC Beta SRL");
  });

  it("search case-insensitive", () => {
    const result = filterInvoices(invoices, "toate", "toate", "alpha");
    expect(result).toHaveLength(1);
  });

  it("returnează array gol când nu există rezultate", () => {
    const result = filterInvoices(invoices, "toate", "toate", "XYZ_inexistent");
    expect(result).toHaveLength(0);
  });

  it("combină filtrul de tip și status", () => {
    const result = filterInvoices(invoices, "venit", "plătită", "");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});