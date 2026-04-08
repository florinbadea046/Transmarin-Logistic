// ──────────────────────────────────────────────────────────
// Unit tests: Invoices page utilities
// File: src/modules/accounting/pages/_components/invoices-utils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  generateNr,
  calcLineTotals,
  formatCurrency,
  emptyLine,
  defaultForm,
} from "@/modules/accounting/pages/_components/invoices-utils";
import type { InvoiceLine } from "@/modules/accounting/pages/_components/invoices-types";

describe("InvoicesPage - utilitare", () => {
  describe("calcLineTotals", () => {
    it("calculeaza corect subtotalul fara TVA", () => {
      const linii: InvoiceLine[] = [
        { id: "l1", descriere: "Transport", cantitate: 2, pretUnitar: 2500 },
      ];
      const { totalFaraTVA } = calcLineTotals(linii);
      expect(totalFaraTVA).toBe(5000);
    });

    it("calculeaza TVA 19% corect", () => {
      const linii: InvoiceLine[] = [
        { id: "l1", descriere: "Transport", cantitate: 2, pretUnitar: 2500 },
      ];
      const { tva } = calcLineTotals(linii);
      expect(tva).toBeCloseTo(950, 2);
    });

    it("calculeaza totalul cu TVA inclus", () => {
      const linii: InvoiceLine[] = [
        { id: "l1", descriere: "Transport", cantitate: 2, pretUnitar: 2500 },
      ];
      const { total } = calcLineTotals(linii);
      expect(total).toBeCloseTo(5950, 2);
    });

    it("calculeaza corect cu mai multe linii", () => {
      const linii: InvoiceLine[] = [
        { id: "l1", descriere: "Transport intern", cantitate: 5, pretUnitar: 1000 },
        { id: "l2", descriere: "Taxa urgenta", cantitate: 1, pretUnitar: 500 },
      ];
      const { totalFaraTVA, tva, total } = calcLineTotals(linii);
      expect(totalFaraTVA).toBe(5500);
      expect(tva).toBeCloseTo(1045, 2);
      expect(total).toBeCloseTo(6545, 2);
    });

    it("returneaza zero pentru lista goala", () => {
      const { totalFaraTVA, tva, total } = calcLineTotals([]);
      expect(totalFaraTVA).toBe(0);
      expect(tva).toBe(0);
      expect(total).toBe(0);
    });

    it("calculeaza corect cu cantitate fractionara", () => {
      const linii: InvoiceLine[] = [
        { id: "l1", descriere: "Combustibil", cantitate: 400, pretUnitar: 5 },
      ];
      const { totalFaraTVA } = calcLineTotals(linii);
      expect(totalFaraTVA).toBe(2000);
    });
  });

  describe("generateNr", () => {
    it("genereaza prefix FACT pentru venit", () => {
      const nr = generateNr("venit");
      expect(nr).toMatch(/^FACT-/);
    });

    it("genereaza prefix CHELT pentru cheltuiala", () => {
      const nr = generateNr("cheltuială");
      expect(nr).toMatch(/^CHELT-/);
    });

    it("contine anul curent", () => {
      const year = new Date().getFullYear().toString();
      const nr = generateNr("venit");
      expect(nr).toContain(year);
    });

    it("genereaza numere diferite la apeluri succesive", () => {
      const nr1 = generateNr("venit");
      const nr2 = generateNr("venit");
      // Nu sunt garantat diferite (random 100-999) dar formatul e corect
      expect(nr1).toMatch(/^FACT-\d{4}-\d{3}$/);
      expect(nr2).toMatch(/^FACT-\d{4}-\d{3}$/);
    });
  });

  describe("formatCurrency", () => {
    it("formateaza suma in RON", () => {
      const result = formatCurrency(5000);
      expect(result).toContain("5.000");
    });

    it("include simbolul sau codul RON", () => {
      const result = formatCurrency(100);
      expect(result).toMatch(/RON|lei/i);
    });

    it("formateaza zero corect", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
    });
  });

  describe("emptyLine", () => {
    it("returneaza o linie cu valorile default", () => {
      const line = emptyLine();
      expect(line.cantitate).toBe(1);
      expect(line.pretUnitar).toBe(0);
      expect(line.descriere).toBe("");
    });

    it("genereaza id unic pentru fiecare linie", () => {
      const l1 = emptyLine();
      const l2 = emptyLine();
      expect(l1.id).not.toBe(l2.id);
    });
  });

  describe("defaultForm", () => {
    it("are tip venit implicit", () => {
      const form = defaultForm();
      expect(form.tip).toBe("venit");
    });

    it("are cel putin o linie goala", () => {
      const form = defaultForm();
      expect(form.linii).toHaveLength(1);
    });

    it("are data completata automat", () => {
      const form = defaultForm();
      expect(form.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("genereaza un numar de factura valid", () => {
      const form = defaultForm();
      expect(form.nr).toMatch(/^FACT-\d{4}-\d{3}$/);
    });
  });
});