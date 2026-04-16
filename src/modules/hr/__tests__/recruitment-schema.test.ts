import { describe, it, expect } from "vitest";
import { makeCandidateSchema } from "@/modules/hr/pages/_components/recruitment-schema";

const t = ((k: string) => k) as unknown as Parameters<typeof makeCandidateSchema>[0];
const schema = makeCandidateSchema(t);

const valid = {
  name: "Andrei Stoica",
  position: "Sofer Tir",
  email: "andrei@x.com",
  phone: "0721234567",
  applicationDate: "2026-04-15",
  rating: 4,
  status: "applied" as const,
};

describe("makeCandidateSchema", () => {
  it("accepts a valid candidate", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects short name", () => {
    expect(schema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(schema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects short phone", () => {
    expect(schema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("rejects empty applicationDate", () => {
    expect(schema.safeParse({ ...valid, applicationDate: "" }).success).toBe(false);
  });

  it("rejects rating outside 1-5", () => {
    expect(schema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it("coerces string rating to number", () => {
    const result = schema.safeParse({ ...valid, rating: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rating).toBe(3);
  });

  it("notes is optional", () => {
    const { notes: _notes, ...without } = { ...valid, notes: "x" };
    expect(schema.safeParse(without).success).toBe(true);
  });

  it("rejects invalid status enum value", () => {
    expect(schema.safeParse({ ...valid, status: "invalid_status" }).success).toBe(false);
  });
});
