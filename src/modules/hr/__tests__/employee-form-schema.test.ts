// ──────────────────────────────────────────────────────────
// Unit tests: Employee form Zod validation
// File: src/modules/hr/components/employee-form-schema.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { makeEmployeeSchema } from "@/modules/hr/components/employee-form-schema";

const t = ((k: string) => k) as unknown as Parameters<typeof makeEmployeeSchema>[0];
const schema = makeEmployeeSchema(t);

const valid = {
  name: "Ion Popescu",
  position: "Dispecer",
  department: "Dispecerat",
  phone: "0721234567",
  email: "ion@x.com",
  hireDate: "2024-01-15",
  salary: 5000,
};

describe("makeEmployeeSchema", () => {
  it("accepts a fully valid employee", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects short name", () => {
    expect(schema.safeParse({ ...valid, name: "X" }).success).toBe(false);
  });

  it("rejects short position", () => {
    expect(schema.safeParse({ ...valid, position: "X" }).success).toBe(false);
  });

  it("rejects short department", () => {
    expect(schema.safeParse({ ...valid, department: "" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(schema.safeParse({ ...valid, email: "not-email" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, email: "@x" }).success).toBe(false);
  });

  it("accepts various email formats", () => {
    expect(schema.safeParse({ ...valid, email: "a@b.co" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, email: "first.last+tag@sub.domain.com" }).success).toBe(true);
  });

  it("rejects short phone", () => {
    expect(schema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });

  it("requires hireDate", () => {
    expect(schema.safeParse({ ...valid, hireDate: "" }).success).toBe(false);
  });

  it("rejects salary <= 0", () => {
    expect(schema.safeParse({ ...valid, salary: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, salary: -100 }).success).toBe(false);
  });

  it("coerces string salary to number", () => {
    const result = schema.safeParse({ ...valid, salary: "5000" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.salary).toBe(5000);
  });

  it("returns translation keys as error messages", () => {
    const result = schema.safeParse({ ...valid, name: "" });
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("employees.validation.nameRequired");
    }
  });
});
