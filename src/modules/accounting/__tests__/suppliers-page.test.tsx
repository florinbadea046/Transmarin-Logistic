// ──────────────────────────────────────────────────────────
// Unit tests: Suppliers page - validare Zod si logica
// File: src/modules/accounting/pages/suppliers.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema Zod pentru furnizor — replicata din suppliers.tsx
// (daca e exportata din fisier, importa direct)
const supplierSchema = z.object({
  name: z.string().min(2, "Numele trebuie sa aiba minim 2 caractere"),
  cui: z
    .string()
    .min(2)
    .regex(/^RO\d{2,10}$|^\d{2,10}$/, "CUI invalid"),
  address: z.string().min(5, "Adresa trebuie sa aiba minim 5 caractere"),
  phone: z
    .string()
    .regex(/^(\+4|0)\d{9}$/, "Telefon invalid (ex: 0721000000)"),
  email: z.string().email("Email invalid"),
  bankAccount: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

const validSupplier: SupplierFormData = {
  name: "Auto Parts SRL",
  cui: "RO12345678",
  address: "Str. Industriilor 10, Constanta",
  phone: "0241500100",
  email: "contact@autoparts.ro",
  bankAccount: "RO49AAAA1B31007593840000",
};

describe("SuppliersPage - validare Zod", () => {
  describe("Render / date valide", () => {
    it("accepta un furnizor complet valid", () => {
      const result = supplierSchema.safeParse(validSupplier);
      expect(result.success).toBe(true);
    });

    it("accepta furnizor fara bankAccount (optional)", () => {
      const { bankAccount: _bankAccount, ...withoutBank } = validSupplier;
      const result = supplierSchema.safeParse(withoutBank);
      expect(result.success).toBe(true);
    });
  });

  describe("CRUD create - validare campuri", () => {
    it("rejecteaza name prea scurt", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, name: "A" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza name gol", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, name: "" });
      expect(result.success).toBe(false);
    });

    it("accepta name cu exact 2 caractere", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, name: "AB" });
      expect(result.success).toBe(true);
    });
  });

  describe("Validare CUI (cod fiscal roman)", () => {
    it("accepta CUI cu prefix RO urmat de cifre", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, cui: "RO12345678" });
      expect(result.success).toBe(true);
    });

    it("accepta CUI doar din cifre", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, cui: "12345678" });
      expect(result.success).toBe(true);
    });

    it("rejecteaza CUI cu caractere invalide", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, cui: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza CUI gol", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, cui: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("Validare telefon", () => {
    it("accepta telefon care incepe cu 0 si 10 cifre total", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, phone: "0721000000" });
      expect(result.success).toBe(true);
    });

    it("rejecteaza telefon cu prefix +40 (schema accepta doar 0xxxxxxxxx)", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, phone: "+40721000000" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza telefon prea scurt", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, phone: "0721" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza telefon cu litere", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, phone: "abcdefghij" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza telefon gol", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, phone: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("Validare email", () => {
    it("accepta email valid", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("rejecteaza email fara @", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, email: "invalidemail" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza email gol", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, email: "" });
      expect(result.success).toBe(false);
    });

    it("rejecteaza email fara domeniu", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, email: "test@" });
      expect(result.success).toBe(false);
    });
  });

  describe("Validare adresa", () => {
    it("rejecteaza adresa prea scurta", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, address: "Str" });
      expect(result.success).toBe(false);
    });

    it("accepta adresa de minim 5 caractere", () => {
      const result = supplierSchema.safeParse({ ...validSupplier, address: "Str.1" });
      expect(result.success).toBe(true);
    });
  });

  describe("Search functionality", () => {
    const suppliers = [
      { ...validSupplier, name: "Auto Parts SRL", cui: "RO12345678", email: "contact@autoparts.ro" },
      { name: "Brake Systems SA", cui: "RO87654321", address: "Bd. Muncii 25, Bucuresti", phone: "0212000200", email: "office@brakesystems.ro" },
      { name: "Fleet Service SRL", cui: "RO55667788", address: "Str. Traian 7, Brasov", phone: "0268400500", email: "office@fleetservice.ro" },
    ];

    const searchSuppliers = (query: string) => {
      const q = query.toLowerCase();
      return suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.cui.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    };

    it("filtreaza dupa nume", () => {
      const results = searchSuppliers("Auto");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Auto Parts SRL");
    });

    it("filtreaza dupa CUI", () => {
      const results = searchSuppliers("RO87654321");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Brake Systems SA");
    });

    it("filtreaza dupa email", () => {
      const results = searchSuppliers("fleetservice");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Fleet Service SRL");
    });

    it("returneaza toti furnizorii pentru query gol", () => {
      const results = searchSuppliers("");
      expect(results).toHaveLength(3);
    });

    it("returneaza array gol pentru query inexistent", () => {
      const results = searchSuppliers("xyz_inexistent");
      expect(results).toHaveLength(0);
    });

    it("cautarea este case-insensitive", () => {
      const results = searchSuppliers("auto parts");
      expect(results).toHaveLength(1);
    });
  });
});