// ──────────────────────────────────────────────────────────
// Unit tests: Zod validation schemas
// File: src/modules/fleet/validation/fleetSchemas.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  makePartSchema,
  makeFuelSchema,
  makeServiceSchema,
} from "@/modules/fleet/validation/fleetSchemas";

const t = (k: string) => k;

describe("makePartSchema", () => {
  const schema = makePartSchema(t);
  const valid = {
    name: "Filter Bosch",
    code: "FB-001",
    category: "engine" as const,
    quantity: 10,
    minStock: 5,
    unitPrice: 50,
    supplier: "Bosch",
  };

  it("accepts valid part", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects short name", () => {
    expect(schema.safeParse({ ...valid, name: "X" }).success).toBe(false);
  });

  it("rejects invalid category", () => {
    expect(schema.safeParse({ ...valid, category: "invalid" }).success).toBe(false);
  });

  it("rejects negative quantity", () => {
    expect(schema.safeParse({ ...valid, quantity: -1 }).success).toBe(false);
  });

  it("accepts zero quantity (out of stock)", () => {
    expect(schema.safeParse({ ...valid, quantity: 0 }).success).toBe(true);
  });

  it("rejects negative minStock", () => {
    expect(schema.safeParse({ ...valid, minStock: -1 }).success).toBe(false);
  });

  it("rejects zero or negative unitPrice (must be positive)", () => {
    expect(schema.safeParse({ ...valid, unitPrice: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, unitPrice: -5 }).success).toBe(false);
  });

  it("code is optional", () => {
    const { code: _code, ...without } = valid;
    expect(schema.safeParse(without).success).toBe(true);
  });

  it("supplier is optional", () => {
    const { supplier: _supplier, ...without } = valid;
    expect(schema.safeParse(without).success).toBe(true);
  });
});

describe("makeFuelSchema", () => {
  const schema = makeFuelSchema(t);
  const valid = {
    truckId: "t1",
    date: "2026-04-15",
    mileage: 150000,
    liters: 100,
    cost: 700,
  };

  it("accepts valid fuel record", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty truckId", () => {
    expect(schema.safeParse({ ...valid, truckId: "" }).success).toBe(false);
  });

  it("rejects empty date", () => {
    expect(schema.safeParse({ ...valid, date: "" }).success).toBe(false);
  });

  it("rejects zero or negative mileage/liters/cost", () => {
    expect(schema.safeParse({ ...valid, mileage: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, liters: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, cost: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, liters: -10 }).success).toBe(false);
  });
});

describe("makeServiceSchema", () => {
  const schema = makeServiceSchema(t);
  const valid = {
    truckId: "t1",
    type: "revision" as const,
    description: "Revizie tehnică completă",
    date: "2026-04-15",
    mileageAtService: 150000,
    partsUsed: [{ partId: "p1", quantity: 2 }],
  };

  it("accepts valid service record", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty truckId", () => {
    expect(schema.safeParse({ ...valid, truckId: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(schema.safeParse({ ...valid, type: "unknown" }).success).toBe(false);
  });

  it("accepts all 4 valid types", () => {
    expect(schema.safeParse({ ...valid, type: "revision" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, type: "repair" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, type: "itp" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, type: "other" }).success).toBe(true);
  });

  it("rejects description with fewer than 5 chars", () => {
    expect(schema.safeParse({ ...valid, description: "abc" }).success).toBe(false);
  });

  it("rejects zero or negative mileageAtService", () => {
    expect(schema.safeParse({ ...valid, mileageAtService: 0 }).success).toBe(false);
  });

  it("nextServiceDate is optional", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, nextServiceDate: "2026-10-15" }).success).toBe(true);
  });

  it("rejects parts with non-positive quantity", () => {
    expect(
      schema.safeParse({ ...valid, partsUsed: [{ partId: "p1", quantity: 0 }] }).success,
    ).toBe(false);
  });

  it("accepts empty partsUsed array", () => {
    expect(schema.safeParse({ ...valid, partsUsed: [] }).success).toBe(true);
  });
});
