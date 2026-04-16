import { describe, it, expect } from "vitest";
import { makeTrainingSchema } from "@/modules/hr/pages/_components/trainings-schema";

const t = ((k: string) => k) as unknown as Parameters<typeof makeTrainingSchema>[0];
const schema = makeTrainingSchema(t);

const valid = {
  title: "Conducere defensiva",
  type: "extern" as const,
  date: "2026-05-15",
  durationHours: 8,
  trainer: "DriveSafe Romania",
  participantIds: ["e1", "e2"],
  status: "planificat" as const,
};

describe("makeTrainingSchema", () => {
  it("accepts a valid training", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects short title", () => {
    expect(schema.safeParse({ ...valid, title: "X" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(schema.safeParse({ ...valid, type: "invalid" }).success).toBe(false);
  });

  it("rejects empty date", () => {
    expect(schema.safeParse({ ...valid, date: "" }).success).toBe(false);
  });

  it("rejects duration < 0.5", () => {
    expect(schema.safeParse({ ...valid, durationHours: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, durationHours: 0.4 }).success).toBe(false);
  });

  it("coerces string duration to number", () => {
    const result = schema.safeParse({ ...valid, durationHours: "4" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.durationHours).toBe(4);
  });

  it("rejects empty participants list", () => {
    expect(schema.safeParse({ ...valid, participantIds: [] }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(schema.safeParse({ ...valid, status: "draft" }).success).toBe(false);
  });

  it("accepts all 3 status values", () => {
    expect(schema.safeParse({ ...valid, status: "planificat" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, status: "in_curs" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, status: "finalizat" }).success).toBe(true);
  });
});
