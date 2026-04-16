import { describe, it, expect } from "vitest";
import {
  makeExpenseSchema,
  EMPTY_FORM,
  PIE_COLORS,
} from "@/modules/transport/pages/_components/recurring-expenses-utils";

const t = (k: string) => k;

describe("makeExpenseSchema", () => {
  const schema = makeExpenseSchema(t);

  it("accepts a fully valid expense", () => {
    const result = schema.safeParse({
      category: "asigurare",
      truckId: "t1",
      description: "RCA truck CT-01",
      monthlyAmount: 200,
      nextPaymentDate: "2026-04-16",
      status: "neplatit",
      notes: "Renew",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = schema.safeParse({
      ...EMPTY_FORM,
      truckId: "t1",
      description: "test",
      monthlyAmount: -50,
      nextPaymentDate: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = schema.safeParse({
      ...EMPTY_FORM,
      truckId: "t1",
      description: "test",
      monthlyAmount: 0,
      nextPaymentDate: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = schema.safeParse({
      ...EMPTY_FORM,
      truckId: "t1",
      description: "test",
      monthlyAmount: 100,
      nextPaymentDate: "16-04-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = schema.safeParse({
      category: "invalid",
      truckId: "t1",
      description: "test",
      monthlyAmount: 100,
      nextPaymentDate: "2026-04-16",
      status: "neplatit",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty truckId", () => {
    const result = schema.safeParse({
      ...EMPTY_FORM,
      truckId: "",
      description: "test",
      monthlyAmount: 100,
      nextPaymentDate: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });

  it("requires description min length 2", () => {
    const result = schema.safeParse({
      ...EMPTY_FORM,
      truckId: "t1",
      description: "x",
      monthlyAmount: 100,
      nextPaymentDate: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });

  it("notes is optional", () => {
    const result = schema.safeParse({
      category: "leasing",
      truckId: "t1",
      description: "Rate leasing",
      monthlyAmount: 1500,
      nextPaymentDate: "2026-04-30",
      status: "platit",
    });
    expect(result.success).toBe(true);
  });
});

describe("PIE_COLORS", () => {
  it("provides 5 distinct colors", () => {
    expect(PIE_COLORS).toHaveLength(5);
    expect(new Set(PIE_COLORS).size).toBe(5);
  });

  it("colors are valid hex values", () => {
    PIE_COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe("EMPTY_FORM", () => {
  it("starts with safe defaults", () => {
    expect(EMPTY_FORM.category).toBe("asigurare");
    expect(EMPTY_FORM.status).toBe("neplatit");
    expect(EMPTY_FORM.monthlyAmount).toBe(0);
    expect(EMPTY_FORM.truckId).toBe("");
  });
});
